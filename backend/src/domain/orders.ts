import { randomUUID } from "node:crypto";
import { config } from "../config.ts";
import { all, now, one, run, tx } from "../db.ts";
import { isValidCpf, onlyDigits } from "../lib/cpf.ts";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors.ts";
import { payments, type PaymentInfo } from "../payments.ts";
import { batchStatus, type BatchRow, type EventRow } from "./events.ts";

export interface OrderRow {
  id: string; user_id: string; event_id: string; batch_id: string; quantity: number; unit_price: number;
  subtotal: number; fee: number; total: number;
  status: "pending" | "paid" | "expired" | "cancelled" | "refund_required";
  payment_provider: string; payment_id: string | null; payment_data: string; expires_at: string;
  paid_at: string | null; created_at: string;
}

export const platformFee = (subtotal: number) => Math.round(subtotal * config.feeRate);

export function toOrder(o: OrderRow) {
  const ev = one<{ title: string; slug: string; starts_at: string }>("SELECT title, slug, starts_at FROM events WHERE id = ?", o.event_id);
  const b = one<{ name: string }>("SELECT name FROM batches WHERE id = ?", o.batch_id);
  return {
    id: o.id, status: o.status, eventId: o.event_id, eventTitle: ev?.title ?? "", eventSlug: ev?.slug ?? "",
    eventStartsAt: ev?.starts_at ?? "", batchId: o.batch_id, batchName: b?.name ?? "", quantity: o.quantity,
    unitPrice: o.unit_price, subtotal: o.subtotal, fee: o.fee, total: o.total,
    payment: o.status === "pending" ? (JSON.parse(o.payment_data) as PaymentInfo) : null,
    paymentProvider: o.payment_provider, expiresAt: o.expires_at, paidAt: o.paid_at, createdAt: o.created_at,
  };
}

export interface Holder { name: string; cpf: string }

/** Cria o pedido reservando o estoque. Regras de CPF, estoque e janela de vendas são validadas aqui. */
export async function createOrder(userId: string, input: { eventId: string; batchId: string; holders: Holder[] }) {
  expireStaleOrders();
  const holders = input.holders.map((h) => ({ name: h.name.trim(), cpf: onlyDigits(h.cpf) }));
  if (holders.length < 1 || holders.length > config.maxTicketsPerOrder)
    throw badRequest("INVALID_QUANTITY", `Escolha entre 1 e ${config.maxTicketsPerOrder} ingressos.`);
  for (const h of holders) {
    if (h.name.length < 3) throw badRequest("INVALID_HOLDER", "Informe o nome completo de cada titular.");
    if (!isValidCpf(h.cpf)) throw badRequest("INVALID_CPF", `CPF inválido: ${h.cpf}`);
  }

  const buyer = one<{ email: string }>("SELECT email FROM users WHERE id = ?", userId);
  if (!buyer) throw notFound("Usuário não encontrado.");

  const order = tx(() => {
    const ev = one<EventRow>("SELECT * FROM events WHERE id = ? OR slug = ?", input.eventId, input.eventId);
    if (!ev || ev.status !== "published") throw notFound("Evento não encontrado.");
    if (ev.starts_at < now()) throw badRequest("EVENT_STARTED", "As vendas deste evento já foram encerradas.");
    const b = one<BatchRow>("SELECT * FROM batches WHERE id = ? AND event_id = ?", input.batchId, ev.id);
    if (!b) throw notFound("Lote não encontrado.");
    const st = batchStatus(b);
    if (st === "soldout") throw conflict("SOLD_OUT", "Este lote esgotou.");
    if (st !== "active") throw conflict("BATCH_UNAVAILABLE", "Este lote não está à venda no momento.");
    if (b.total - b.sold - b.reserved < holders.length)
      throw conflict("NOT_ENOUGH_STOCK", `Restam apenas ${b.total - b.sold - b.reserved} ingressos neste lote.`);

    // Limite de ingressos por CPF no evento (conta ingressos ativos + reservas pendentes).
    const perCpf = new Map<string, number>();
    for (const h of holders) perCpf.set(h.cpf, (perCpf.get(h.cpf) ?? 0) + 1);
    for (const [cpf, n] of perCpf) {
      const { c } = one<{ c: number }>(
        "SELECT COUNT(*) c FROM tickets WHERE event_id = ? AND holder_cpf = ? AND status IN ('pending','valid','used')", ev.id, cpf,
      )!;
      if (c + n > ev.max_per_cpf)
        throw conflict("CPF_LIMIT", `O CPF ${cpf.slice(0, 3)}.***.***-${cpf.slice(9)} atingiu o limite de ${ev.max_per_cpf} ingressos neste evento.`);
    }

    const id = randomUUID();
    const subtotal = b.price * holders.length;
    const fee = platformFee(subtotal);
    const t = now();
    const expires = new Date(Date.now() + config.reservationMinutes * 60_000).toISOString();
    run("UPDATE batches SET reserved = reserved + ? WHERE id = ?", holders.length, b.id);
    run(
      `INSERT INTO orders (id, user_id, event_id, batch_id, quantity, unit_price, subtotal, fee, total, status, payment_provider, expires_at, created_at)
       VALUES (?,?,?,?,?,?,?,?,?, 'pending', ?, ?, ?)`,
      id, userId, ev.id, b.id, holders.length, b.price, subtotal, fee, subtotal + fee, payments.name, expires, t,
    );
    for (const h of holders)
      run(
        `INSERT INTO tickets (id, order_id, event_id, batch_id, owner_id, holder_name, holder_cpf, status, created_at)
         VALUES (?,?,?,?,?,?,?, 'pending', ?)`,
        randomUUID(), id, ev.id, b.id, userId, h.name, h.cpf, t,
      );
    return { id, total: subtotal + fee, title: `${ev.title} — ${b.name}`, expires };
  });

  // Ingresso gratuito: aprova direto.
  if (order.total === 0) {
    approveOrder(order.id);
    return one<OrderRow>("SELECT * FROM orders WHERE id = ?", order.id)!;
  }

  try {
    const p = await payments.create({
      orderId: order.id, amountCents: order.total, description: order.title, payerEmail: buyer.email, expiresAt: order.expires,
    });
    run("UPDATE orders SET payment_id = ?, payment_data = ? WHERE id = ?", p.id, JSON.stringify(p.info), order.id);
  } catch (e) {
    releaseOrder(order.id, "cancelled");
    throw e;
  }
  return one<OrderRow>("SELECT * FROM orders WHERE id = ?", order.id)!;
}

/** Pagamento confirmado: emite os ingressos (QR fica válido). Idempotente. */
export function approveOrder(orderId: string) {
  return tx(() => {
    const o = one<OrderRow>("SELECT * FROM orders WHERE id = ?", orderId);
    if (!o) throw notFound("Pedido não encontrado.");
    if (o.status === "paid") return o;
    const t = now();
    if (o.status === "pending") {
      run("UPDATE batches SET reserved = reserved - ?, sold = sold + ? WHERE id = ?", o.quantity, o.quantity, o.batch_id);
    } else {
      // Pagamento chegou depois que a reserva expirou: tenta reservar de novo.
      const b = one<BatchRow>("SELECT * FROM batches WHERE id = ?", o.batch_id)!;
      if (b.total - b.sold - b.reserved < o.quantity) {
        run("UPDATE orders SET status = 'refund_required' WHERE id = ?", o.id);
        return { ...o, status: "refund_required" as const };
      }
      run("UPDATE batches SET sold = sold + ? WHERE id = ?", o.quantity, o.batch_id);
    }
    run("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?", t, o.id);
    run("UPDATE tickets SET status = 'valid' WHERE order_id = ?", o.id);
    return { ...o, status: "paid" as const, paid_at: t };
  });
}

/** Libera o estoque reservado de um pedido pendente. */
export function releaseOrder(orderId: string, status: "expired" | "cancelled") {
  tx(() => {
    const o = one<OrderRow>("SELECT * FROM orders WHERE id = ? AND status = 'pending'", orderId);
    if (!o) return;
    run("UPDATE batches SET reserved = reserved - ? WHERE id = ?", o.quantity, o.batch_id);
    run("UPDATE orders SET status = ? WHERE id = ?", status, o.id);
    run("UPDATE tickets SET status = 'cancelled' WHERE order_id = ?", o.id);
  });
}

export function expireStaleOrders() {
  const stale = all<{ id: string }>("SELECT id FROM orders WHERE status = 'pending' AND expires_at < ?", now());
  for (const o of stale) releaseOrder(o.id, "expired");
  return stale.length;
}

export function cancelOwnOrder(userId: string, orderId: string) {
  const o = one<OrderRow>("SELECT * FROM orders WHERE id = ?", orderId);
  if (!o) throw notFound("Pedido não encontrado.");
  if (o.user_id !== userId) throw forbidden();
  if (o.status !== "pending") throw conflict("ORDER_NOT_PENDING", "Só é possível cancelar pedidos aguardando pagamento.");
  releaseOrder(o.id, "cancelled");
}

/** Reconsulta o provedor e atualiza o pedido. Usado pelo webhook e pelo polling do checkout. */
export async function syncPayment(o: OrderRow) {
  if (!o.payment_id || o.payment_provider !== payments.name || o.status === "paid") return o;
  const s = await payments.status(o.payment_id);
  if (s === "approved") approveOrder(o.id);
  else if ((s === "rejected" || s === "cancelled") && o.status === "pending") releaseOrder(o.id, "cancelled");
  return one<OrderRow>("SELECT * FROM orders WHERE id = ?", o.id)!;
}
