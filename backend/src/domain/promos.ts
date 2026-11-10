// Cupons de desconto e ingressos de cortesia.
import { randomUUID } from "node:crypto";
import { all, now, one, run, tx } from "../db.js";
import { isValidCpf, maskCpf, onlyDigits } from "../lib/cpf.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { courtesyEmail, sendEmail } from "../lib/email.js";
import type { BatchRow, EventRow } from "./events.js";

// ---------------- Cupons ----------------
export interface CouponRow {
  id: string; event_id: string; code: string; kind: "percent" | "fixed"; value: number;
  max_uses: number | null; active: number; created_at: string;
}

/** Códigos guardados em maiúsculas, sem espaços: "verao10" e " VERAO10 " são o mesmo cupom. */
export const normalizeCoupon = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");

/** Ingressos já reservados ou vendidos com o cupom (pedidos expirados/cancelados liberam o uso). */
export async function couponUses(couponId: string) {
  return (await one<{ n: number }>(
    "SELECT COALESCE(SUM(quantity), 0) n FROM orders WHERE coupon_id = ? AND status IN ('pending','paid')", couponId))!.n;
}

/** Desconto em centavos sobre o valor dos ingressos (nunca maior que ele). */
export function discountFor(c: Pick<CouponRow, "kind" | "value">, unitPrice: number, quantity: number) {
  const gross = unitPrice * quantity;
  const d = c.kind === "percent" ? Math.round((gross * Math.min(c.value, 100)) / 100) : c.value * quantity;
  return Math.min(d, gross);
}

/** Procura um cupom ativo do evento e confere se ainda tem uso. Usado na compra (dentro da transação) e na prévia. */
export async function findUsableCoupon(eventId: string, code: string, quantity: number, lock = false) {
  const c = await one<CouponRow>(`SELECT * FROM coupons WHERE event_id = ? AND code = ?${lock ? " FOR UPDATE" : ""}`, eventId, normalizeCoupon(code));
  if (!c || !c.active) throw badRequest("INVALID_COUPON", "Cupom inválido ou encerrado.");
  if (c.max_uses !== null && (await couponUses(c.id)) + quantity > c.max_uses)
    throw conflict("COUPON_EXHAUSTED", "Este cupom já atingiu o limite de usos.");
  return c;
}

export async function toCoupon(c: CouponRow) {
  return { id: c.id, code: c.code, kind: c.kind, value: c.value, maxUses: c.max_uses, active: !!c.active, uses: await couponUses(c.id), createdAt: c.created_at };
}

export async function createCoupon(eventId: string, d: { code: string; kind: "percent" | "fixed"; value: number; maxUses?: number | null }) {
  const code = normalizeCoupon(d.code);
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw badRequest("INVALID_COUPON_CODE", "O código do cupom deve ter de 3 a 30 letras ou números, sem espaços.");
  if (d.kind === "percent" && (d.value < 1 || d.value > 100)) throw badRequest("INVALID_COUPON_VALUE", "O desconto em % deve ser de 1 a 100.");
  if (await one("SELECT 1 FROM coupons WHERE event_id = ? AND code = ?", eventId, code))
    throw conflict("COUPON_EXISTS", `Já existe um cupom ${code} neste evento.`);
  const id = randomUUID();
  await run("INSERT INTO coupons (id, event_id, code, kind, value, max_uses, active, created_at) VALUES (?,?,?,?,?,?,1,?)",
    id, eventId, code, d.kind, d.value, d.maxUses ?? null, now());
  return toCoupon((await one<CouponRow>("SELECT * FROM coupons WHERE id = ?", id))!);
}

// ---------------- Cortesias ----------------
/**
 * Ingresso de cortesia: pedido "pago" com valor zero, feito pelo organizador. Ocupa uma vaga do lote escolhido.
 * Se já existe conta com o CPF, o ingresso vai direto para ela. Senão, fica com o organizador e é oferecido
 * ao CPF (a pessoa cria a conta com o CPF e aceita em "Meus ingressos", como numa transferência).
 */
export async function issueCourtesy(organizerId: string, eventId: string, d: { batchId: string; name: string; cpf: string; email?: string }) {
  const name = d.name.trim();
  const cpf = onlyDigits(d.cpf);
  if (name.length < 3) throw badRequest("INVALID_HOLDER", "Informe o nome completo de quem vai ganhar o ingresso.");
  if (!isValidCpf(cpf)) throw badRequest("INVALID_CPF", "CPF inválido. Confira os números.");

  const res = await tx(async () => {
    const ev = await one<EventRow>("SELECT * FROM events WHERE id = ? FOR UPDATE", eventId);
    if (!ev) throw notFound("Evento não encontrado.");
    if (ev.status === "cancelled") throw conflict("EVENT_CANCELLED", "Este evento foi cancelado.");
    if (ev.starts_at < now()) throw badRequest("EVENT_STARTED", "O evento já começou.");
    const b = await one<BatchRow>("SELECT * FROM batches WHERE id = ? AND event_id = ? FOR UPDATE", d.batchId, eventId);
    if (!b) throw notFound("Tipo de ingresso não encontrado.");
    if (b.total - b.sold - b.reserved < 1) throw conflict("SOLD_OUT", `Não há vaga livre em "${b.name}". Aumente a quantidade do lote para dar a cortesia.`);
    const { c } = (await one<{ c: number }>(
      "SELECT COUNT(*) c FROM tickets WHERE event_id = ? AND holder_cpf = ? AND status IN ('pending','valid','used')", eventId, cpf))!;
    if (c >= ev.max_per_cpf) throw conflict("CPF_LIMIT", `Esse CPF já tem ${ev.max_per_cpf} ingresso(s) neste evento, que é o limite.`);

    const recipient = await one<{ id: string; email: string; name: string }>("SELECT id, email, name FROM users WHERE cpf = ? LIMIT 1", cpf);
    const t = now();
    const orderId = randomUUID();
    const ticketId = randomUUID();
    await run(
      `INSERT INTO orders (id, user_id, event_id, batch_id, quantity, unit_price, subtotal, fee, total, status, payment_provider, expires_at, paid_at, created_at, kind)
       VALUES (?,?,?,?,1,0,0,0,0,'paid','courtesy',?,?,?,'courtesy')`,
      orderId, organizerId, eventId, b.id, t, t, t,
    );
    await run("UPDATE batches SET sold = sold + 1 WHERE id = ?", b.id);
    await run(
      `INSERT INTO tickets (id, order_id, event_id, batch_id, owner_id, holder_name, holder_cpf, status, created_at)
       VALUES (?,?,?,?,?,?,?, 'valid', ?)`,
      ticketId, orderId, eventId, b.id, recipient?.id ?? organizerId, name, cpf, t,
    );
    if (!recipient)
      await run("INSERT INTO ticket_transfers (id, ticket_id, from_user_id, to_cpf, status, expires_at, created_at) VALUES (?,?,?,?, 'pending', ?, ?)",
        randomUUID(), ticketId, organizerId, cpf, ev.starts_at, t);
    return { ticketId, recipient, title: ev.title };
  });

  const to = res.recipient?.email ?? d.email?.trim();
  if (to) await sendEmail(courtesyEmail(to, res.recipient?.name ?? name, res.title, !!res.recipient));
  return (await listCourtesies(eventId)).find((x) => x.id === res.ticketId)!;
}

export async function listCourtesies(eventId: string) {
  const rows = await all<{ id: string; holder_name: string; holder_cpf: string; status: string; batch_name: string; created_at: string; owner_id: string; org_id: string; org_cpf: string | null; pending: number }>(
    `SELECT t.id, t.holder_name, t.holder_cpf, t.status, t.created_at, t.owner_id, o.user_id org_id, u.cpf org_cpf, b.name batch_name,
       (SELECT COUNT(*) FROM ticket_transfers tt WHERE tt.ticket_id = t.id AND tt.status = 'pending') pending
     FROM tickets t JOIN orders o ON o.id = t.order_id JOIN batches b ON b.id = t.batch_id JOIN users u ON u.id = o.user_id
     WHERE t.event_id = ? AND o.kind = 'courtesy' AND t.status <> 'cancelled' ORDER BY t.created_at DESC`, eventId);
  return rows.map((r) => ({
    id: r.id, holderName: r.holder_name, holderCpf: maskCpf(r.holder_cpf), batchName: r.batch_name, createdAt: r.created_at,
    // waiting: aguardando a pessoa aceitar; declined: ela recusou; delivered: já está na conta dela; used: já entrou.
    state: (r.status === "used" ? "used"
      : r.owner_id !== r.org_id || r.holder_cpf === r.org_cpf ? "delivered"
      : Number(r.pending) > 0 ? "waiting" : "declined") as "used" | "delivered" | "waiting" | "declined",
  }));
}

/** Cancela uma cortesia ainda não usada: libera a vaga e o QR deixa de valer. */
export async function revokeCourtesy(ticketId: string) {
  await tx(async () => {
    const t = await one<{ id: string; status: string; batch_id: string; order_id: string; kind: string }>(
      "SELECT t.id, t.status, t.batch_id, t.order_id, o.kind FROM tickets t JOIN orders o ON o.id = t.order_id WHERE t.id = ? FOR UPDATE", ticketId);
    if (!t || t.kind !== "courtesy") throw notFound("Cortesia não encontrada.");
    if (t.status === "used") throw conflict("ALREADY_USED", "Essa pessoa já entrou no evento com essa cortesia.");
    if (t.status === "cancelled") return;
    await run("UPDATE tickets SET status = 'cancelled' WHERE id = ?", t.id);
    await run("UPDATE orders SET status = 'cancelled' WHERE id = ?", t.order_id);
    await run("UPDATE batches SET sold = sold - 1 WHERE id = ?", t.batch_id);
    await run("UPDATE ticket_transfers SET status = 'cancelled', resolved_at = ? WHERE ticket_id = ? AND status = 'pending'", now(), t.id);
  });
}

export async function courtesyEventId(ticketId: string) {
  const r = await one<{ event_id: string }>(
    "SELECT t.event_id FROM tickets t JOIN orders o ON o.id = t.order_id WHERE t.id = ? AND o.kind = 'courtesy'", ticketId);
  if (!r) throw notFound("Cortesia não encontrada.");
  return r.event_id;
}
