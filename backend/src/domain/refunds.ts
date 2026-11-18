// Devoluções vistas pelo admin: o que falta devolver (e por quê), o que já foi devolvido e o que ainda está no prazo.
import { config } from "../config.js";
import { all, now, one, run } from "../db.js";
import { conflict, notFound } from "../lib/errors.js";
import { orderRefundedEmail, sendEmail } from "../lib/email.js";
import { payments } from "../payments.js";
import { authForOrder } from "./mpaccounts.js";
import { markRefunded, type OrderRow } from "./orders.js";

/**
 * Por que o dinheiro precisa voltar:
 * - buyer: o comprador pediu a devolução e o Mercado Pago recusou o estorno (ingressos ainda valem);
 * - event_cancelled: o evento foi cancelado e o estorno automático falhou;
 * - late_payment: o pagamento chegou depois que a reserva venceu e não havia mais vaga (ou o evento já estava cancelado);
 * - duplicate: a pessoa pagou duas vezes (Pix e cartão) e o estorno do pagamento repetido falhou.
 */
export type RefundKind = "buyer" | "event_cancelled" | "late_payment" | "duplicate";

interface Row extends OrderRow {
  event_title: string; event_starts_at: string; event_status: string; organizer_name: string;
  buyer_name: string; buyer_email: string; refund_requested_at: string | null; refund_error: string | null; refund_note: string | null;
}

const BASE = `SELECT o.*, e.title event_title, e.starts_at event_starts_at, e.status event_status, org.name organizer_name,
                     u.name buyer_name, u.email buyer_email
                FROM orders o JOIN events e ON e.id = o.event_id JOIN users org ON org.id = e.organizer_id JOIN users u ON u.id = o.user_id`;

async function methodOf(paymentId: string | null) {
  if (!paymentId) return "pix";
  return (await one("SELECT 1 FROM order_payments WHERE id = ? AND method = 'card'", paymentId)) ? "card" : "pix";
}

async function item(r: Row, kind: RefundKind, paymentId: string | null, amount = r.total) {
  return {
    orderId: r.id, kind, paymentId, amount, method: await methodOf(paymentId),
    buyer: { name: r.buyer_name, email: r.buyer_email },
    event: { id: r.event_id, title: r.event_title, startsAt: r.event_starts_at, organizer: r.organizer_name },
    // Onde o dinheiro está: na conta do organizador (split) ou na do BooTickets.
    inOrganizerAccount: !!r.seller_id,
    since: r.refund_requested_at ?? r.paid_at ?? r.created_at,
    error: r.refund_error ?? null,
  };
}

/** Tudo que falta devolver, do mais antigo para o mais novo. */
export async function pendingRefunds() {
  const out: Awaited<ReturnType<typeof item>>[] = [];
  const buyer = await all<Row>(`${BASE} WHERE o.status = 'paid' AND o.refund_requested_at IS NOT NULL AND e.status <> 'cancelled'`);
  for (const r of buyer) out.push(await item(r, "buyer", r.paid_payment_id ?? r.payment_id));
  const cancelled = await all<Row>(`${BASE} WHERE o.status = 'paid' AND e.status = 'cancelled' AND o.total > 0`);
  for (const r of cancelled) out.push(await item(r, "event_cancelled", r.paid_payment_id ?? r.payment_id));
  const late = await all<Row>(`${BASE} WHERE o.status = 'refund_required'`);
  for (const r of late) {
    // O pagamento que precisa voltar: o cartão aprovado, se houver; senão o Pix do pedido.
    const card = await one<{ id: string }>("SELECT id FROM order_payments WHERE order_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1", r.id);
    out.push(await item(r, "late_payment", card?.id ?? r.payment_id));
  }
  // Cartão aprovado num pedido que foi pago por outro pagamento e cujo estorno automático falhou.
  const dup = await all<Row & { dup_id: string }>(
    `SELECT x.*, p.id dup_id FROM (${BASE}) x JOIN order_payments p ON p.order_id = x.id
      WHERE x.status IN ('paid','refunded') AND x.paid_payment_id IS NOT NULL AND p.status = 'approved' AND p.id <> x.paid_payment_id`);
  for (const r of dup) out.push(await item(r, "duplicate", r.dup_id));
  return out.sort((a, b) => a.since.localeCompare(b.since));
}

/** Devoluções já feitas (as 300 mais recentes) e o motivo de cada uma. */
export async function doneRefunds() {
  const rows = await all<Row>(`${BASE} WHERE o.status = 'refunded' ORDER BY COALESCE(o.refunded_at, o.paid_at, o.created_at) DESC LIMIT 300`);
  return rows.map((r) => ({
    orderId: r.id, amount: r.total, refundedAt: r.refunded_at ?? null,
    reason: r.refund_note === "manual" ? "manual" : r.refund_by_buyer || r.refund_requested_at ? "buyer" : r.event_status === "cancelled" ? "event_cancelled" : "late_payment",
    buyer: { name: r.buyer_name, email: r.buyer_email },
    event: { id: r.event_id, title: r.event_title, organizer: r.organizer_name },
    inOrganizerAccount: !!r.seller_id,
  }));
}

/** Compras pagas que ainda podem ser devolvidas pelo comprador (dentro dos 7 dias e antes do evento). */
export async function refundWindow() {
  const since = new Date(Date.now() - config.refundDays * 86400_000).toISOString();
  const r = (await one<{ n: number; amount: number }>(
    `SELECT COUNT(*)::int n, COALESCE(SUM(o.total), 0)::int amount FROM orders o JOIN events e ON e.id = o.event_id
      WHERE o.status = 'paid' AND o.kind = 'sale' AND o.total > 0 AND o.paid_at > ? AND e.starts_at > ? AND e.status <> 'cancelled'`, since, now()))!;
  return { orders: Number(r.n), amount: Number(r.amount) };
}

/** Acha a pendência pelo pedido + pagamento (recalculada no servidor: o admin não escolhe o que estornar). */
async function findPending(orderId: string, paymentId: string | null) {
  const p = (await pendingRefunds()).find((x) => x.orderId === orderId && (x.paymentId ?? null) === (paymentId ?? null));
  if (!p) throw notFound("Esta devolução não está mais pendente. Recarregue a página.");
  return p;
}

/** Conclui a pendência no banco (o dinheiro já voltou, pelo Mercado Pago ou por fora). */
async function settle(p: Awaited<ReturnType<typeof findPending>>, manual: boolean) {
  const t = now();
  if (p.kind === "duplicate") {
    await run("UPDATE order_payments SET status = 'refunded' WHERE id = ?", p.paymentId);
  } else if (p.kind === "late_payment") {
    await run("UPDATE orders SET status = 'refunded', refunded_at = ?, refund_error = NULL, refund_note = ? WHERE id = ? AND status = 'refund_required'",
      t, manual ? "manual" : null, p.orderId);
    if (p.paymentId) await run("UPDATE order_payments SET status = 'refunded' WHERE id = ?", p.paymentId);
  } else {
    await markRefunded(p.orderId);
    await run("UPDATE orders SET refunded_at = ?, refund_error = NULL, refund_note = ? WHERE id = ?", t, manual ? "manual" : null, p.orderId);
  }
}

/** Tenta de novo o estorno pelo Mercado Pago. */
export async function retryRefund(orderId: string, paymentId: string | null) {
  const p = await findPending(orderId, paymentId);
  const o = (await one<OrderRow>("SELECT * FROM orders WHERE id = ?", orderId))!;
  try {
    if (p.paymentId && p.amount > 0) await payments.refund(p.paymentId, await authForOrder(o));
  } catch (e) {
    const reason = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    await run("UPDATE orders SET refund_error = ? WHERE id = ?", reason, orderId);
    throw conflict("REFUND_FAILED", `O Mercado Pago recusou o estorno de novo: ${reason}`);
  }
  await settle(p, false);
  if (p.kind !== "duplicate") await sendEmail(orderRefundedEmail(p.buyer.email, p.buyer.name, p.event.title, p.amount)).catch(() => undefined);
  return { ok: true };
}

/** O admin devolveu por fora (ex.: Pix direto para o comprador): só registra, não movimenta dinheiro. */
export async function markRefundedManually(orderId: string, paymentId: string | null, adminId: string) {
  const p = await findPending(orderId, paymentId);
  await settle(p, true);
  console.warn(`Admin ${adminId} marcou como devolvido por fora: pedido ${orderId}, pagamento ${paymentId ?? "-"} (${p.kind}).`);
  return { ok: true };
}
