import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { all, now, one, run, tx } from "../db.js";
import { toEventDetail, type BatchRow, type EventRow } from "../domain/events.js";
import { courtesyEventId, createCoupon, issueCourtesy, listCourtesies, revokeCourtesy, toCoupon, type CouponRow } from "../domain/promos.js";
import { isValidCpf, onlyDigits } from "../lib/cpf.js";
import { removeEvent } from "../domain/orders.js";
import { config } from "../config.js";
import { eventEditedEmail, eventForReviewEmail, sendEmail } from "../lib/email.js";
import { maskCpf } from "../lib/cpf.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { assertEventOwner, parse, requireRole, user } from "../lib/http.js";

export const organizerRouter = Router();
organizerRouter.use(requireRole("organizer"));

const iso = z.string().datetime({ offset: true });
const batchSchema = z.object({
  name: z.string().trim().min(1).max(60),
  price: z.number().int().min(0), // centavos
  total: z.number().int().min(1).max(1_000_000),
  salesStart: iso,
  salesEnd: iso,
  status: z.enum(["active", "paused", "closed"]).default("active"),
  // Tipo de ingresso (Pista, Camarote…). Lotes do mesmo tipo viram automaticamente, na ordem.
  ticketType: z.string().trim().max(40).nullable().default(null),
});
const eventSchema = z.object({
  title: z.string().trim().min(3).max(140),
  category: z.enum(["shows", "festas", "conferencias", "teatro", "esportes"]),
  coverUrl: z.string().url().or(z.literal("")).default(""),
  startsAt: iso,
  venue: z.string().trim().min(2),
  city: z.string().trim().min(2),
  address: z.string().trim().default(""),
  description: z.string().default(""),
  importantInfo: z.array(z.string()).default([]),
  refundPolicy: z.string().default(""),
  maxTransfers: z.number().int().min(0).max(10).default(1),
  transferDeadline: iso.nullable().default(null),
  maxTicketsPerCpf: z.number().int().min(1).max(20).default(2),
  status: z.enum(["draft", "published"]).default("published"),
  // "unlisted" = privado: não aparece na lista nem na busca, só com o link.
  visibility: z.enum(["public", "unlisted"]).default("public"),
  // Palavra-senha para comprar ('' = sem senha).
  accessCode: z.string().trim().max(40).default(""),
  batches: z.array(batchSchema).default([]),
});
const couponSchema = z.object({
  code: z.string().trim().min(3).max(30),
  kind: z.enum(["percent", "fixed"]),
  value: z.number().int().min(1), // % (1–100) ou centavos por ingresso
  maxUses: z.number().int().min(1).max(1_000_000).nullable().optional(),
});
const courtesySchema = z.object({
  name: z.string().trim().min(3).max(120),
  cpf: z.string().max(20),
  email: z.string().trim().toLowerCase().email().or(z.literal("")).optional(),
});

/** Link difícil de adivinhar para evento privado: "festa-da-lua-k3x9p2qa". */
const privateSlug = (title: string) => `${slugify(title) || "evento"}-${randomUUID().replace(/-/g, "").slice(0, 8)}`;

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);

async function insertBatch(eventId: string, b: z.infer<typeof batchSchema>, position: number) {
  if (b.salesEnd <= b.salesStart) throw badRequest("INVALID_DATES", `Lote "${b.name}": fim das vendas antes do início.`);
  const id = randomUUID();
  await run(
    "INSERT INTO batches (id, event_id, name, price, total, sales_start, sales_end, status, position, ticket_type) VALUES (?,?,?,?,?,?,?,?,?,?)",
    id, eventId, b.name, b.price, b.total, new Date(b.salesStart).toISOString(), new Date(b.salesEnd).toISOString(), b.status, position, b.ticketType || null,
  );
  return id;
}

organizerRouter.get("/events", async (req, res) => {
  // "Meus eventos" mostra só os eventos da própria conta, inclusive para admin (todos os eventos ficam no Admin).
  const rows = await all<EventRow>("SELECT * FROM events WHERE organizer_id = ? ORDER BY starts_at DESC", user(req).id);
  res.json(await Promise.all(rows.map(organizerView)));
});

/** Evento visto pelo organizador: dados públicos + números de vendas e repasses. */
async function organizerView(e: EventRow) {
  const s = (await one<{ sold: number; revenue: number; direct: number; checked: number; paid_out: number; buyers: number; pending: number; courtesies: number }>(
    `SELECT
       (SELECT COUNT(*) FROM tickets WHERE event_id = ? AND status IN ('valid','used')) sold,
       (SELECT COALESCE(SUM(subtotal), 0) FROM orders WHERE event_id = ? AND status = 'paid') revenue,
       (SELECT COALESCE(SUM(subtotal), 0) FROM orders WHERE event_id = ? AND status = 'paid' AND seller_id IS NOT NULL) direct,
       (SELECT COUNT(*) FROM tickets WHERE event_id = ? AND status = 'used') checked,
       (SELECT COALESCE(SUM(amount), 0) FROM organizer_payouts WHERE event_id = ?) paid_out,
       (SELECT COUNT(DISTINCT user_id) FROM orders WHERE event_id = ? AND status = 'paid' AND kind = 'sale') buyers,
       (SELECT COALESCE(SUM(quantity), 0) FROM orders WHERE event_id = ? AND status = 'pending') pending,
       (SELECT COUNT(*) FROM tickets t JOIN orders o ON o.id = t.order_id
          WHERE t.event_id = ? AND o.kind = 'courtesy' AND t.status IN ('valid','used')) courtesies`,
    e.id, e.id, e.id, e.id, e.id, e.id, e.id, e.id,
  ))!;
  return {
    ...(await toEventDetail(e)),
    reviewNote: e.review_note ?? "",
    accessCode: e.access_code ?? "",
    // Vendas pela conta Mercado Pago conectada (direct) já caíram com o organizador; o repasse manual é só do resto.
    stats: {
      ticketsSold: s.sold, revenue: s.revenue, checkedIn: s.checked, paidOut: s.paid_out, receivedDirect: Number(s.direct),
      toReceive: Math.max(0, s.revenue - Number(s.direct) - s.paid_out), buyers: s.buyers, awaitingPayment: s.pending, courtesies: Number(s.courtesies),
    },
  };
}

/** Painel de um evento: resumo, vendas por lote (pagas) e números da portaria. */
organizerRouter.get("/events/:id", async (req, res) => {
  const id = String(req.params.id);
  await assertEventOwner(user(req), id);
  const e = (await one<EventRow>("SELECT * FROM events WHERE id = ?", id))!;
  // Receita pelo valor que cada pessoa realmente pagou (o preço do lote pode ter mudado depois).
  const lots = await all<BatchRow & { revenue: number }>(
    `SELECT b.*, COALESCE((SELECT SUM(COALESCE(t.price, o.subtotal / GREATEST(o.quantity, 1))) FROM tickets t JOIN orders o ON o.id = t.order_id
                 WHERE t.batch_id = b.id AND o.status = 'paid'), 0) revenue
     FROM batches b WHERE b.event_id = ? ORDER BY b.position, b.price`, id);
  res.json({
    ...(await organizerView(e)),
    salesByBatch: lots.map((b) => ({
      id: b.id, name: b.name, price: b.price, total: b.total, sold: b.sold, reserved: b.reserved, revenue: Number(b.revenue),
      status: b.status, ticketType: b.ticket_type, salesStart: b.sales_start, salesEnd: b.sales_end,
    })),
  });
});

organizerRouter.post("/events", async (req, res) => {
  const d = parse(eventSchema.extend({
    coupons: z.array(couponSchema).max(50).default([]),
    // Cortesias já na criação: "batchIndex" é a posição do tipo de ingresso na lista de lotes enviada.
    courtesies: z.array(courtesySchema.extend({ batchIndex: z.number().int().min(0) })).max(200).default([]),
  }), req.body);
  for (const c of d.courtesies) {
    if (!isValidCpf(onlyDigits(c.cpf))) throw badRequest("INVALID_CPF", `CPF inválido na cortesia de ${c.name}.`);
    if (!d.batches[c.batchIndex]) throw badRequest("INVALID_BATCH", `Escolha o tipo de ingresso da cortesia de ${c.name}.`);
  }
  const a = user(req);
  const isAdmin = a.roles.includes("admin");
  // Eventos de organizadores passam pela aprovação do BooTickets antes de ir ao ar (evita evento falso).
  const status = d.status === "draft" ? "draft" : isAdmin ? "published" : "review";
  const id = randomUUID();
  let slug = d.visibility === "unlisted" ? privateSlug(d.title) : slugify(d.title) || "evento";
  if (await one("SELECT 1 FROM events WHERE slug = ?", slug)) slug = `${slug}-${id.slice(0, 6)}`;
  const batchIds: string[] = [];
  await tx(async () => {
    await run(
      `INSERT INTO events (id, slug, organizer_id, title, category, cover_url, starts_at, venue, city, address, description,
        important_info, refund_policy, max_transfers, transfer_deadline, max_per_cpf, status, created_at, visibility, access_code)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, slug, a.id, d.title, d.category, d.coverUrl, new Date(d.startsAt).toISOString(), d.venue, d.city, d.address, d.description,
      JSON.stringify(d.importantInfo), d.refundPolicy, d.maxTransfers,
      d.transferDeadline ? new Date(d.transferDeadline).toISOString() : null, d.maxTicketsPerCpf, status, now(), d.visibility, d.accessCode,
    );
    for (const [i, b] of d.batches.entries()) batchIds.push(await insertBatch(id, b, i));
    for (const c of d.coupons) await createCoupon(id, c);
  });
  // Cortesias depois do evento criado. Se alguma falhar (ex.: CPF já no limite), as outras seguem e o motivo volta na resposta.
  const courtesyErrors: string[] = [];
  for (const c of d.courtesies) {
    try { await issueCourtesy(a.id, id, { batchId: batchIds[c.batchIndex]!, name: c.name, cpf: c.cpf, email: c.email || undefined }); }
    catch (e) { courtesyErrors.push(`${c.name}: ${e instanceof Error ? e.message : "erro"}`); }
  }
  if (status === "review") {
    const org = await one<{ name: string }>("SELECT name FROM users WHERE id = ?", a.id);
    for (const to of config.adminEmails) await sendEmail(eventForReviewEmail(to, d.title, org?.name ?? "Organizador"));
  }
  res.status(201).json({ ...(await toEventDetail((await one<EventRow>("SELECT * FROM events WHERE id = ?", id))!)), courtesyErrors });
});

organizerRouter.patch("/events/:id", async (req, res) => {
  await assertEventOwner(user(req), req.params.id);
  // Cancelar só pelo "Remover" (DELETE), que estorna os compradores. Aqui só rascunho/publicado.
  const d = parse(eventSchema.omit({ batches: true }).partial().extend({ status: z.enum(["draft", "published"]).optional() }), req.body);
  const isAdmin = user(req).roles.includes("admin");
  const cur = (await one<EventRow>("SELECT * FROM events WHERE id = ?", String(req.params.id)))!;
  if (cur.status === "cancelled") throw conflict("EVENT_CANCELLED", "Este evento foi cancelado e não pode mais ser editado.");
  if (d.status === "draft") {
    const sold = await one("SELECT 1 FROM orders WHERE event_id = ? AND status IN ('paid','pending')", String(req.params.id));
    if (sold) throw conflict("HAS_SALES", "Este evento já tem vendas. Para tirar do ar, use “Remover” (os compradores são reembolsados).");
  }
  let changed: string[] = [];
  if (!isAdmin) {
    // Publicar é decisão do admin. Editar um evento já aprovado NÃO tira ele do ar (as vendas continuam),
    // mas o admin recebe um e-mail com o que mudou, para conferir que não virou outro evento.
    if (d.status === "published" && cur.status !== "published") d.status = "review" as never;
    if (cur.status === "published") {
      const labels: Record<string, string> = { title: "nome", category: "categoria", coverUrl: "foto de capa", startsAt: "data/horário",
        venue: "local", city: "cidade", address: "endereço", description: "descrição", importantInfo: "avisos", maxTicketsPerCpf: "limite por CPF" };
      const old: Record<string, unknown> = { title: cur.title, category: cur.category, coverUrl: cur.cover_url, startsAt: cur.starts_at,
        venue: cur.venue, city: cur.city, address: cur.address, description: cur.description, importantInfo: cur.important_info,
        maxTicketsPerCpf: cur.max_per_cpf };
      changed = Object.keys(labels).filter((k) => {
        const v = d[k as keyof typeof d];
        if (v === undefined) return false;
        const nv = k === "startsAt" ? new Date(v as string).toISOString() : k === "importantInfo" ? JSON.stringify(v) : v;
        return nv !== old[k];
      }).map((k) => labels[k]!);
    }
  }
  const map: Record<string, [string, (v: never) => unknown]> = {
    title: ["title", (v) => v], category: ["category", (v) => v], coverUrl: ["cover_url", (v) => v],
    startsAt: ["starts_at", (v: string) => new Date(v).toISOString()], venue: ["venue", (v) => v], city: ["city", (v) => v],
    address: ["address", (v) => v], description: ["description", (v) => v], importantInfo: ["important_info", (v) => JSON.stringify(v)],
    refundPolicy: ["refund_policy", (v) => v], maxTransfers: ["max_transfers", (v) => v],
    transferDeadline: ["transfer_deadline", (v: string | null) => (v ? new Date(v).toISOString() : null)],
    maxTicketsPerCpf: ["max_per_cpf", (v) => v], status: ["status", (v) => v],
    visibility: ["visibility", (v) => v], accessCode: ["access_code", (v) => v],
  };
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  for (const [k, v] of Object.entries(d)) {
    const m = map[k];
    if (!m || v === undefined) continue;
    sets.push(`${m[0]} = ?`);
    vals.push(m[1](v as never) as string | number | null);
  }
  // Ficou privado: o link muda para um difícil de adivinhar (o antigo, que talvez já circulou, para de funcionar).
  if (d.visibility === "unlisted" && cur.visibility !== "unlisted") { sets.push("slug = ?"); vals.push(privateSlug(d.title ?? cur.title)); }
  if (sets.length) await run(`UPDATE events SET ${sets.join(", ")} WHERE id = ?`, ...vals, req.params.id);
  if (changed.length) for (const to of config.adminEmails) await sendEmail(eventEditedEmail(to, d.title ?? cur.title, cur.slug, changed));
  res.json(await toEventDetail((await one<EventRow>("SELECT * FROM events WHERE id = ?", req.params.id))!));
});

async function assertEditable(eventId: string) {
  const e = await one<{ status: string }>("SELECT status FROM events WHERE id = ?", eventId);
  if (e?.status === "cancelled") throw conflict("EVENT_CANCELLED", "Este evento foi cancelado e não pode mais ser editado.");
}

organizerRouter.post("/events/:id/batches", async (req, res) => {
  await assertEventOwner(user(req), req.params.id);
  await assertEditable(String(req.params.id));
  const b = parse(batchSchema, req.body);
  const { n } = (await one<{ n: number }>("SELECT COUNT(*) n FROM batches WHERE event_id = ?", req.params.id))!;
  await insertBatch(req.params.id, b, n);
  res.status(201).json(await toEventDetail((await one<EventRow>("SELECT * FROM events WHERE id = ?", req.params.id))!));
});

organizerRouter.patch("/batches/:id", async (req, res) => {
  const b = await one<BatchRow>("SELECT * FROM batches WHERE id = ?", req.params.id);
  if (!b) throw notFound("Lote não encontrado.");
  await assertEventOwner(user(req), b.event_id);
  await assertEditable(b.event_id);
  const d = parse(batchSchema.partial(), req.body);
  if (d.total !== undefined && d.total < b.sold + b.reserved)
    throw conflict("TOTAL_BELOW_SOLD", `Já existem ${b.sold + b.reserved} ingressos vendidos/reservados neste lote.`);
  const next = { ...b, ...{ name: d.name ?? b.name, price: d.price ?? b.price, total: d.total ?? b.total, status: d.status ?? b.status,
    sales_start: d.salesStart ? new Date(d.salesStart).toISOString() : b.sales_start,
    sales_end: d.salesEnd ? new Date(d.salesEnd).toISOString() : b.sales_end,
    ticket_type: d.ticketType !== undefined ? (d.ticketType || null) : b.ticket_type } };
  if (next.sales_end <= next.sales_start) throw badRequest("INVALID_DATES", `Lote "${next.name}": fim das vendas antes do início.`);
  // Quem já pagou mantém o preço antigo; o novo preço vale só para as próximas compras.
  await run("UPDATE batches SET name = ?, price = ?, total = ?, status = ?, sales_start = ?, sales_end = ?, ticket_type = ? WHERE id = ?",
    next.name, next.price, next.total, next.status, next.sales_start, next.sales_end, next.ticket_type, b.id);
  res.json(await toEventDetail((await one<EventRow>("SELECT * FROM events WHERE id = ?", b.event_id))!));
});

/** Exclui um lote que nunca teve pedido. Com pedidos, só dá para pausar (o histórico de vendas fica). */
organizerRouter.delete("/batches/:id", async (req, res) => {
  const b = await one<BatchRow>("SELECT * FROM batches WHERE id = ?", req.params.id);
  if (!b) throw notFound("Lote não encontrado.");
  await assertEventOwner(user(req), b.event_id);
  await assertEditable(b.event_id);
  if (await one("SELECT 1 FROM tickets WHERE batch_id = ? LIMIT 1", b.id))
    throw conflict("BATCH_HAS_ORDERS", `O lote "${b.name}" já tem compras. Em vez de excluir, pause as vendas dele.`);
  const { n } = (await one<{ n: number }>("SELECT COUNT(*) n FROM batches WHERE event_id = ?", b.event_id))!;
  if (n <= 1) throw conflict("LAST_BATCH", "O evento precisa ter pelo menos um tipo de ingresso.");
  await run("DELETE FROM batches WHERE id = ?", b.id);
  res.json(await toEventDetail((await one<EventRow>("SELECT * FROM events WHERE id = ?", b.event_id))!));
});

/** Lista de participantes (CPF mascarado). */
/**
 * Lista de participantes: um item por ingresso pago (CPF parcialmente oculto, como diz a Política de Privacidade).
 * "Comprador" é quem pagou; "titular" é quem entra (pode ser outra pessoa, inclusive por transferência).
 */
organizerRouter.get("/events/:id/tickets", async (req, res) => {
  const id = String(req.params.id);
  await assertEventOwner(user(req), id);
  const rows = await all<{
    id: string; holder_name: string; holder_cpf: string; status: string; checked_in_at: string | null; batch: string;
    owner_email: string; buyer_name: string; buyer_email: string; buyer_id: string; owner_id: string;
    order_id: string; unit_price: number; paid_at: string | null; transfers: number; kind: string; discount: number; quantity: number; price: number | null;
  }>(
    `SELECT t.id, t.holder_name, t.holder_cpf, t.status, t.checked_in_at, t.transfers, t.owner_id, b.name batch,
            uo.email owner_email, ub.name buyer_name, ub.email buyer_email, ub.id buyer_id,
            o.id order_id, o.unit_price, o.paid_at, o.kind, o.discount, o.quantity, t.price
     FROM tickets t JOIN batches b ON b.id = t.batch_id JOIN orders o ON o.id = t.order_id
       JOIN users uo ON uo.id = t.owner_id JOIN users ub ON ub.id = o.user_id
     WHERE t.event_id = ? AND t.status IN ('valid','used') ORDER BY o.paid_at DESC, t.holder_name`, id,
  );
  res.json(rows.map((t) => ({
    id: t.id, holderName: t.holder_name, holderCpf: maskCpf(t.holder_cpf), status: t.status, checkedInAt: t.checked_in_at,
    // Preço pago por ingresso (já com o desconto do cupom, se houve).
    batchName: t.batch, price: t.price ?? Math.round(t.unit_price - (t.discount ?? 0) / Math.max(1, t.quantity)), paidAt: t.paid_at, orderId: t.order_id,
    courtesy: t.kind === "courtesy",
    buyerName: t.buyer_name, buyerEmail: t.buyer_email, ownerEmail: t.owner_email,
    transferred: t.transfers > 0 || t.owner_id !== t.buyer_id,
  })));
});

// ---- Cupons de desconto ----
organizerRouter.get("/events/:id/coupons", async (req, res) => {
  const id = String(req.params.id);
  await assertEventOwner(user(req), id);
  const rows = await all<CouponRow>("SELECT * FROM coupons WHERE event_id = ? ORDER BY created_at DESC", id);
  res.json(await Promise.all(rows.map(toCoupon)));
});

organizerRouter.post("/events/:id/coupons", async (req, res) => {
  const id = String(req.params.id);
  await assertEventOwner(user(req), id);
  await assertEditable(id);
  res.status(201).json(await createCoupon(id, parse(couponSchema, req.body)));
});

async function ownCoupon(req: Parameters<typeof user>[0], couponId: string) {
  const c = await one<CouponRow>("SELECT * FROM coupons WHERE id = ?", couponId);
  if (!c) throw notFound("Cupom não encontrado.");
  await assertEventOwner(user(req), c.event_id);
  return c;
}

/** Pausar/reativar ou mudar o limite de usos. */
organizerRouter.patch("/coupons/:id", async (req, res) => {
  const c = await ownCoupon(req, String(req.params.id));
  const d = parse(z.object({ active: z.boolean().optional(), maxUses: z.number().int().min(1).max(1_000_000).nullable().optional() }), req.body);
  if (d.active !== undefined) await run("UPDATE coupons SET active = ? WHERE id = ?", d.active ? 1 : 0, c.id);
  if (d.maxUses !== undefined) await run("UPDATE coupons SET max_uses = ? WHERE id = ?", d.maxUses, c.id);
  res.json(await toCoupon((await one<CouponRow>("SELECT * FROM coupons WHERE id = ?", c.id))!));
});

/** Exclui o cupom. Se já foi usado, só desativa (o histórico das compras com desconto fica). */
organizerRouter.delete("/coupons/:id", async (req, res) => {
  const c = await ownCoupon(req, String(req.params.id));
  if (await one("SELECT 1 FROM orders WHERE coupon_id = ? LIMIT 1", c.id)) {
    await run("UPDATE coupons SET active = 0 WHERE id = ?", c.id);
    return void res.json({ deleted: false });
  }
  await run("DELETE FROM coupons WHERE id = ?", c.id);
  res.json({ deleted: true });
});

// ---- Ingressos de cortesia ----
organizerRouter.get("/events/:id/courtesies", async (req, res) => {
  const id = String(req.params.id);
  await assertEventOwner(user(req), id);
  res.json(await listCourtesies(id));
});

organizerRouter.post("/events/:id/courtesies", async (req, res) => {
  const id = String(req.params.id);
  await assertEventOwner(user(req), id);
  const d = parse(courtesySchema.extend({ batchId: z.string().min(1) }), req.body);
  res.status(201).json(await issueCourtesy(user(req).id, id, { ...d, email: d.email || undefined }));
});

organizerRouter.delete("/courtesies/:ticketId", async (req, res) => {
  const ticketId = String(req.params.ticketId);
  await assertEventOwner(user(req), await courtesyEventId(ticketId));
  await revokeCourtesy(ticketId);
  res.json({ ok: true });
});

/** Remove o evento: apaga se não houver vendas; com vendas, cancela e estorna os compradores. */
organizerRouter.delete("/events/:id", async (req, res) => {
  const id = String(req.params.id);
  await assertEventOwner(user(req), id);
  res.json(await removeEvent(id));
});

// ---- Dados para receber os repasses ----
organizerRouter.get("/payout-info", async (req, res) => {
  const u = await one<{ payout_pix_key: string | null; payout_holder: string | null }>(
    "SELECT payout_pix_key, payout_holder FROM users WHERE id = ?", user(req).id);
  res.json({ pixKey: u?.payout_pix_key ?? "", holder: u?.payout_holder ?? "" });
});

organizerRouter.put("/payout-info", async (req, res) => {
  const d = parse(z.object({ pixKey: z.string().trim().min(3).max(140), holder: z.string().trim().min(3).max(140) }), req.body);
  await run("UPDATE users SET payout_pix_key = ?, payout_holder = ? WHERE id = ?", d.pixKey, d.holder, user(req).id);
  res.json({ pixKey: d.pixKey, holder: d.holder });
});

// ---- Equipe da portaria ----
organizerRouter.get("/events/:id/staff", async (req, res) => {
  await assertEventOwner(user(req), req.params.id);
  res.json(await all("SELECT u.id, u.name, u.email FROM event_staff s JOIN users u ON u.id = s.user_id WHERE s.event_id = ? ORDER BY u.name", req.params.id));
});

organizerRouter.post("/events/:id/staff", async (req, res) => {
  await assertEventOwner(user(req), req.params.id);
  const { email } = parse(z.object({ email: z.string().trim().toLowerCase().email() }), req.body);
  const u = await one<{ id: string; roles: string }>("SELECT id, roles FROM users WHERE email = ?", email);
  if (!u) throw notFound("Não existe conta com esse e-mail. Peça para a pessoa se cadastrar.");
  await tx(async () => {
    await run("INSERT INTO event_staff (event_id, user_id, created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING", req.params.id, u.id, now());
    const roles = new Set(JSON.parse(u.roles) as string[]);
    if (!roles.has("staff")) { roles.add("staff"); await run("UPDATE users SET roles = ? WHERE id = ?", JSON.stringify([...roles]), u.id); }
  });
  res.status(201).json({ ok: true });
});

organizerRouter.delete("/events/:id/staff/:userId", async (req, res) => {
  await assertEventOwner(user(req), req.params.id);
  await run("DELETE FROM event_staff WHERE event_id = ? AND user_id = ?", req.params.id, req.params.userId);
  res.status(204).end();
});
