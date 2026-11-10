import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { all, now, one, run, tx } from "../db.js";
import { toEventDetail, type EventRow } from "../domain/events.js";
import { markRefunded } from "../domain/orders.js";
import { eventReviewedEmail, payoutEmail, sendEmail } from "../lib/email.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { parse, requireRole, user } from "../lib/http.js";

export const adminRouter = Router();
adminRouter.use(requireRole("admin"));

adminRouter.get("/users", async (req, res) => {
  const q = typeof req.query["q"] === "string" ? `%${req.query["q"]}%` : "%";
  const rows = await all<{ id: string; name: string; email: string; roles: string; created_at: string }>(
    "SELECT id, name, email, roles, created_at FROM users WHERE email ILIKE ? OR name ILIKE ? ORDER BY created_at DESC LIMIT 100", q, q,
  );
  res.json(rows.map((u) => ({ ...u, roles: JSON.parse(u.roles) })));
});

adminRouter.patch("/users/:id/roles", async (req, res) => {
  const { roles } = parse(z.object({ roles: z.array(z.enum(["buyer", "organizer", "staff", "admin"])).min(1) }), req.body);
  const r = await run("UPDATE users SET roles = ? WHERE id = ?", JSON.stringify([...new Set(roles)]), String(req.params.id));
  if (!r.changes) throw notFound("Usuário não encontrado.");
  res.json({ ok: true });
});

// ---------------- Aprovação de eventos ----------------
interface ReviewRow extends EventRow { organizer_name: string; organizer_email: string }

/** Eventos aguardando aprovação (mais antigos primeiro). */
adminRouter.get("/events/review", async (_req, res) => {
  const rows = await all<ReviewRow>(
    `SELECT e.*, u.name organizer_name, u.email organizer_email FROM events e JOIN users u ON u.id = e.organizer_id
     WHERE e.status = 'review' ORDER BY e.created_at`,
  );
  res.json(await Promise.all(rows.map(async (e) => ({
    ...(await toEventDetail(e)),
    createdAt: e.created_at,
    organizerEmail: e.organizer_email,
    organizer: { id: e.organizer_id, name: e.organizer_name },
  }))));
});

async function reviewEvent(eventId: string, approved: boolean, reason: string) {
  const e = await one<ReviewRow>(
    "SELECT e.*, u.name organizer_name, u.email organizer_email FROM events e JOIN users u ON u.id = e.organizer_id WHERE e.id = ?", eventId);
  if (!e) throw notFound("Evento não encontrado.");
  if (e.status !== "review") throw conflict("NOT_IN_REVIEW", "Este evento não está aguardando aprovação.");
  await run("UPDATE events SET status = ?, review_note = ? WHERE id = ?", approved ? "published" : "rejected", reason, e.id);
  await sendEmail(eventReviewedEmail(e.organizer_email, e.organizer_name, e.title, approved, reason, e.slug));
}

adminRouter.post("/events/:id/approve", async (req, res) => {
  await reviewEvent(String(req.params.id), true, "");
  res.json({ ok: true });
});

adminRouter.post("/events/:id/reject", async (req, res) => {
  const { reason } = parse(z.object({ reason: z.string().trim().min(3).max(500) }), req.body);
  await reviewEvent(String(req.params.id), false, reason);
  res.json({ ok: true });
});

// ---------------- Repasses aos organizadores ----------------
interface PayoutRow {
  event_id: string; title: string; slug: string; starts_at: string; status: string;
  organizer_id: string; organizer_name: string; organizer_email: string; payout_pix_key: string | null; payout_holder: string | null;
  revenue: number; direct: number; fees: number; paid_out: number; tickets: number;
}

/**
 * Quanto cada organizador tem a receber, por evento. O organizador recebe o valor cheio dos ingressos
 * (subtotal dos pedidos pagos); a taxa de 10% fica com o Passe e cobre as tarifas do Mercado Pago.
 */
adminRouter.get("/payouts", async (_req, res) => {
  const rows = await all<PayoutRow>(
    `SELECT e.id event_id, e.title, e.slug, e.starts_at, e.status, u.id organizer_id, u.name organizer_name, u.email organizer_email,
            u.payout_pix_key, u.payout_holder,
            COALESCE((SELECT SUM(subtotal) FROM orders WHERE event_id = e.id AND status = 'paid'), 0) revenue,
            COALESCE((SELECT SUM(subtotal) FROM orders WHERE event_id = e.id AND status = 'paid' AND seller_id IS NOT NULL), 0) direct,
            COALESCE((SELECT SUM(fee) FROM orders WHERE event_id = e.id AND status = 'paid'), 0) fees,
            COALESCE((SELECT SUM(amount) FROM organizer_payouts WHERE event_id = e.id), 0) paid_out,
            (SELECT COUNT(*) FROM tickets WHERE event_id = e.id AND status IN ('valid','used')) tickets
     FROM events e JOIN users u ON u.id = e.organizer_id
     WHERE EXISTS (SELECT 1 FROM orders WHERE event_id = e.id AND status = 'paid')
        OR EXISTS (SELECT 1 FROM organizer_payouts WHERE event_id = e.id)
     ORDER BY e.starts_at`,
  );
  const history = await all<{ id: string; event_id: string; amount: number; note: string; paid_at: string }>(
    "SELECT id, event_id, amount, note, paid_at FROM organizer_payouts ORDER BY paid_at DESC",
  );
  res.json(rows.map((r) => ({
    eventId: r.event_id, title: r.title, slug: r.slug, startsAt: r.starts_at, status: r.status, tickets: r.tickets,
    organizer: { id: r.organizer_id, name: r.organizer_name, email: r.organizer_email, pixKey: r.payout_pix_key ?? "", holder: r.payout_holder ?? "" },
    // direct = vendas que já caíram na conta Mercado Pago do organizador (split): não entram no repasse manual.
    revenue: r.revenue, direct: Number(r.direct), platformFees: r.fees, paidOut: r.paid_out, balance: r.revenue - Number(r.direct) - r.paid_out,
    history: history.filter((h) => h.event_id === r.event_id).map((h) => ({ id: h.id, amount: h.amount, note: h.note, paidAt: h.paid_at })),
  })));
});

/**
 * Evento cancelado cujas compras não puderam ser estornadas pelo Mercado Pago (ex.: sem saldo na conta):
 * marca como devolvidas por fora (Pix direto, ou compra de teste). Não movimenta dinheiro nenhum —
 * só cancela os ingressos e zera o saldo a repassar.
 */
adminRouter.post("/events/:id/mark-refunded", async (req, res) => {
  const id = String(req.params.id);
  const e = await one<{ status: string }>("SELECT status FROM events WHERE id = ?", id);
  if (!e) throw notFound("Evento não encontrado.");
  if (e.status !== "cancelled") throw conflict("NOT_CANCELLED", "Só dá para fazer isso em evento cancelado.");
  const paid = await all<{ id: string }>("SELECT id FROM orders WHERE event_id = ? AND status = 'paid'", id);
  for (const o of paid) await markRefunded(o.id);
  console.warn(`Admin ${user(req).id} marcou ${paid.length} compra(s) do evento ${id} como devolvidas por fora.`);
  res.json({ ok: true, orders: paid.length });
});

/** Registra um repasse feito (o Pix em si é feito por você no app do banco). */
adminRouter.post("/payouts", async (req, res) => {
  const d = parse(z.object({ eventId: z.string().min(1), amount: z.number().int().min(1), note: z.string().trim().max(300).default("") }), req.body);
  // Trava o evento: dois cliques seguidos não registram mais do que o saldo.
  const e = await tx(async () => {
    const ev = await one<{ id: string; title: string; organizer_id: string }>("SELECT id, title, organizer_id FROM events WHERE id = ? FOR UPDATE", d.eventId);
    if (!ev) throw notFound("Evento não encontrado.");
    const s = (await one<{ revenue: number; paid_out: number }>(
      `SELECT COALESCE((SELECT SUM(subtotal) FROM orders WHERE event_id = ? AND status = 'paid' AND seller_id IS NULL), 0) revenue,
              COALESCE((SELECT SUM(amount) FROM organizer_payouts WHERE event_id = ?), 0) paid_out`, ev.id, ev.id))!;
    if (d.amount > s.revenue - s.paid_out)
      throw badRequest("PAYOUT_TOO_HIGH", "O valor é maior do que o saldo a repassar deste evento.");
    await run(
      "INSERT INTO organizer_payouts (id, event_id, organizer_id, amount, note, paid_at, created_by) VALUES (?,?,?,?,?,?,?)",
      randomUUID(), ev.id, ev.organizer_id, d.amount, d.note, now(), user(req).id,
    );
    return ev;
  });
  const org = await one<{ email: string; name: string }>("SELECT email, name FROM users WHERE id = ?", e.organizer_id);
  if (org) await sendEmail(payoutEmail(org.email, org.name, e.title, d.amount, d.note));
  res.status(201).json({ ok: true });
});
