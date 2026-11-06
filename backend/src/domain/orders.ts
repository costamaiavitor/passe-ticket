import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { all, now, one, run, tx } from "../db.js";
import { isValidCpf, onlyDigits } from "../lib/cpf.js";
import { badRequest, conflict, forbidden, HttpError, notFound } from "../lib/errors.js";
import { payments, type CardPaymentInput, type PaymentInfo } from "../payments.js";
import { eventCancelledEmail, purchaseEmail, sendEmail } from "../lib/email.js";
import { batchStatuses, type BatchRow, type EventRow } from "./events.js";

export interface OrderRow {
  id: string; user_id: string; event_id: string; batch_id: string; quantity: number; unit_price: number;
  subtotal: number; fee: number; total: number;
  status: "pending" | "paid" | "expired" | "cancelled" | "refund_required" | "refunded";
  payment_provider: string; payment_id: string | null; payment_data: string; expires_at: string;
  paid_at: string | null; created_at: string; paid_payment_id: string | null;
  /** Só no retorno de approveOrder: o pedido acabou de ser pago nesta chamada. */
  justPaid?: boolean;
}

interface OrderPaymentRow { id: string; order_id: string; method: string; status: string; status_detail: string }

export const platformFee = (subtotal: number) => Math.round(subtotal * config.feeRate);

export async function toOrder(o: OrderRow) {
  const ev = await one<{ title: string; slug: string; starts_at: string }>("SELECT title, slug, starts_at FROM events WHERE id = ?", o.event_id);
  const b = await one<{ name: string }>("SELECT name FROM batches WHERE id = ?", o.batch_id);
  return {
    id: o.id, status: o.status, eventId: o.event_id, eventTitle: ev?.title ?? "", eventSlug: ev?.slug ?? "",
    eventStartsAt: ev?.starts_at ?? "", batchId: o.batch_id, batchName: b?.name ?? "", quantity: o.quantity,
    unitPrice: o.unit_price, subtotal: o.subtotal, fee: o.fee, total: o.total,
    payment: o.status === "pending" ? (JSON.parse(o.payment_data) as PaymentInfo) : null,
    // Cartão em análise pelo Mercado Pago: o checkout mostra "pagamento em análise" e continua consultando.
    cardPending: o.status === "pending"
      ? !!(await one("SELECT 1 FROM order_payments WHERE order_id = ? AND method = 'card' AND status = 'pending'", o.id))
      : false,
    paymentProvider: o.payment_provider, expiresAt: o.expires_at, paidAt: o.paid_at, createdAt: o.created_at,
  };
}

export interface Holder { name: string; cpf: string }

/** Cria o pedido reservando o estoque. Regras de CPF, estoque e janela de vendas são validadas aqui. */
export async function createOrder(userId: string, input: { eventId: string; batchId: string; holders: Holder[] }) {
  await expireStaleOrders();
  const holders = input.holders.map((h) => ({ name: h.name.trim(), cpf: onlyDigits(h.cpf) }));
  if (holders.length < 1 || holders.length > config.maxTicketsPerOrder)
    throw badRequest("INVALID_QUANTITY", `Escolha entre 1 e ${config.maxTicketsPerOrder} ingressos.`);
  for (const h of holders) {
    if (h.name.length < 3) throw badRequest("INVALID_HOLDER", "Informe o nome completo de cada titular.");
    if (!isValidCpf(h.cpf)) throw badRequest("INVALID_CPF", `CPF inválido: ${h.cpf}`);
  }

  const buyer = await one<{ email: string }>("SELECT email FROM users WHERE id = ?", userId);
  if (!buyer) throw notFound("Usuário não encontrado.");

  const order = await tx(async () => {
    // Trava o evento: pedidos do mesmo evento são processados um de cada vez (estoque e limite por CPF).
    const ev = await one<EventRow>("SELECT * FROM events WHERE id = ? OR slug = ? FOR UPDATE", input.eventId, input.eventId);
    if (!ev || ev.status !== "published") throw notFound("Evento não encontrado.");
    if (ev.starts_at < now()) throw badRequest("EVENT_STARTED", "As vendas deste evento já foram encerradas.");
    const b = await one<BatchRow>("SELECT * FROM batches WHERE id = ? AND event_id = ? FOR UPDATE", input.batchId, ev.id);
    if (!b) throw notFound("Lote não encontrado.");
    const siblings = await all<BatchRow>("SELECT * FROM batches WHERE event_id = ?", ev.id);
    const st = batchStatuses(siblings).get(b.id);
    if (st === "soldout") throw conflict("SOLD_OUT", "Este lote esgotou.");
    if (st === "upcoming") throw conflict("BATCH_UPCOMING", "Este lote abre quando o lote anterior esgotar.");
    if (st !== "active") throw conflict("BATCH_UNAVAILABLE", "Este lote não está à venda no momento.");
    if (b.total - b.sold - b.reserved < holders.length)
      throw conflict("NOT_ENOUGH_STOCK", `Restam apenas ${b.total - b.sold - b.reserved} ingressos neste lote.`);

    // Limite de ingressos por CPF no evento (conta ingressos ativos + reservas pendentes).
    const perCpf = new Map<string, number>();
    for (const h of holders) perCpf.set(h.cpf, (perCpf.get(h.cpf) ?? 0) + 1);
    for (const [cpf, n] of perCpf) {
      const { c } = (await one<{ c: number }>(
        "SELECT COUNT(*) c FROM tickets WHERE event_id = ? AND holder_cpf = ? AND status IN ('pending','valid','used')", ev.id, cpf,
      ))!;
      if (c + n > ev.max_per_cpf)
        throw conflict("CPF_LIMIT", `O CPF ${cpf.slice(0, 3)}.***.***-${cpf.slice(9)} atingiu o limite de ${ev.max_per_cpf} ingressos neste evento.`);
    }

    const id = randomUUID();
    const subtotal = b.price * holders.length;
    const fee = platformFee(subtotal);
    const t = now();
    const expires = new Date(Date.now() + config.reservationMinutes * 60_000).toISOString();
    await run("UPDATE batches SET reserved = reserved + ? WHERE id = ?", holders.length, b.id);
    await run(
      `INSERT INTO orders (id, user_id, event_id, batch_id, quantity, unit_price, subtotal, fee, total, status, payment_provider, expires_at, created_at)
       VALUES (?,?,?,?,?,?,?,?,?, 'pending', ?, ?, ?)`,
      id, userId, ev.id, b.id, holders.length, b.price, subtotal, fee, subtotal + fee, payments.name, expires, t,
    );
    for (const h of holders)
      await run(
        `INSERT INTO tickets (id, order_id, event_id, batch_id, owner_id, holder_name, holder_cpf, status, created_at)
         VALUES (?,?,?,?,?,?,?, 'pending', ?)`,
        randomUUID(), id, ev.id, b.id, userId, h.name, h.cpf, t,
      );
    return { id, total: subtotal + fee, title: `${ev.title} — ${b.name}`, expires };
  });

  // Ingresso gratuito: aprova direto.
  if (order.total === 0) {
    if ((await approveOrder(order.id)).justPaid) await notifyPaid(order.id);
    return (await one<OrderRow>("SELECT * FROM orders WHERE id = ?", order.id))!;
  }

  try {
    const p = await payments.create({
      orderId: order.id, amountCents: order.total, description: order.title, payerEmail: buyer.email, expiresAt: order.expires,
    });
    await run("UPDATE orders SET payment_id = ?, payment_data = ? WHERE id = ?", p.id, JSON.stringify(p.info), order.id);
  } catch (e) {
    await releaseOrder(order.id, "cancelled");
    if (e instanceof HttpError) throw e;
    // O motivo técnico fica no log (Vercel → Logs); o cliente recebe uma mensagem que dá para entender.
    console.error("Falha ao gerar o pagamento do pedido", order.id, e);
    throw new HttpError(502, "PAYMENT_UNAVAILABLE",
      "Não conseguimos gerar o pagamento agora. Nada foi cobrado. Tente de novo em alguns minutos.");
  }
  return (await one<OrderRow>("SELECT * FROM orders WHERE id = ?", order.id))!;
}

/** Pagamento confirmado: emite os ingressos (QR fica válido). Idempotente. Guarda qual pagamento quitou o pedido. */
export function approveOrder(orderId: string, paymentId: string | null = null) {
  return tx(async () => {
    const o = await one<OrderRow>("SELECT * FROM orders WHERE id = ? FOR UPDATE", orderId);
    if (!o) throw notFound("Pedido não encontrado.");
    if (o.status === "paid" || o.status === "refunded" || o.status === "refund_required") return o;
    const t = now();
    if (o.status === "pending") {
      await run("UPDATE batches SET reserved = reserved - ?, sold = sold + ? WHERE id = ?", o.quantity, o.quantity, o.batch_id);
    } else {
      // Pagamento chegou depois que a reserva expirou: tenta reservar de novo.
      const b = (await one<BatchRow>("SELECT * FROM batches WHERE id = ? FOR UPDATE", o.batch_id))!;
      if (b.total - b.sold - b.reserved < o.quantity) {
        await run("UPDATE orders SET status = 'refund_required' WHERE id = ?", o.id);
        return { ...o, status: "refund_required" as const };
      }
      await run("UPDATE batches SET sold = sold + ? WHERE id = ?", o.quantity, o.batch_id);
    }
    await run("UPDATE orders SET status = 'paid', paid_at = ?, paid_payment_id = ? WHERE id = ?", t, paymentId, o.id);
    await run("UPDATE tickets SET status = 'valid' WHERE order_id = ?", o.id);
    return { ...o, status: "paid" as const, paid_at: t, paid_payment_id: paymentId, justPaid: true };
  });
}

/** Libera o estoque reservado de um pedido pendente. */
export async function releaseOrder(orderId: string, status: "expired" | "cancelled") {
  await tx(async () => {
    const o = await one<OrderRow>("SELECT * FROM orders WHERE id = ? AND status = 'pending' FOR UPDATE", orderId);
    if (!o) return;
    await run("UPDATE batches SET reserved = reserved - ? WHERE id = ?", o.quantity, o.batch_id);
    await run("UPDATE orders SET status = ? WHERE id = ?", status, o.id);
    await run("UPDATE tickets SET status = 'cancelled' WHERE order_id = ?", o.id);
  });
}

export async function expireStaleOrders() {
  const stale = await all<{ id: string }>("SELECT id FROM orders WHERE status = 'pending' AND expires_at < ?", now());
  for (const o of stale) await releaseOrder(o.id, "expired");
  return stale.length;
}

export async function cancelOwnOrder(userId: string, orderId: string) {
  const o = await one<OrderRow>("SELECT * FROM orders WHERE id = ?", orderId);
  if (!o) throw notFound("Pedido não encontrado.");
  if (o.user_id !== userId) throw forbidden();
  if (o.status !== "pending") throw conflict("ORDER_NOT_PENDING", "Só é possível cancelar pedidos aguardando pagamento.");
  await releaseOrder(o.id, "cancelled");
}

/**
 * Um pagamento foi aprovado. Emite os ingressos; se o pedido já tinha sido pago por OUTRO pagamento
 * (ex.: pagou o Pix e o cartão), ou se não havia mais estoque, devolve o dinheiro automaticamente.
 */
async function confirmPayment(orderId: string, paymentId: string) {
  const r = await approveOrder(orderId, paymentId);
  const duplicate = r.status === "paid" && !!r.paid_payment_id && r.paid_payment_id !== paymentId;
  if (duplicate || r.status === "refund_required") {
    try {
      await payments.refund(paymentId);
      await run("UPDATE order_payments SET status = 'refunded' WHERE id = ?", paymentId);
      if (r.status === "refund_required") await run("UPDATE orders SET status = 'refunded' WHERE id = ?", orderId);
      console.warn(`Pagamento ${paymentId} do pedido ${orderId} estornado automaticamente (${duplicate ? "pago em dobro" : "sem estoque"}).`);
    } catch (e) {
      console.error(`ATENÇÃO: estorne manualmente o pagamento ${paymentId} do pedido ${orderId}:`, e);
    }
    return;
  }
  // Pagou no cartão: cancela o Pix que ficou em aberto para ninguém pagar duas vezes.
  if (r.payment_id && r.payment_id !== paymentId) await payments.cancel(r.payment_id).catch(() => undefined);
  if ("justPaid" in r && r.justPaid) await notifyPaid(orderId);
}

/** Estorno ou contestação depois de pago: cancela os ingressos e devolve as vagas ao lote. */
async function markRefunded(orderId: string) {
  await tx(async () => {
    const o = await one<OrderRow>("SELECT * FROM orders WHERE id = ? FOR UPDATE", orderId);
    if (!o || o.status !== "paid") return;
    await run("UPDATE orders SET status = 'refunded' WHERE id = ?", o.id);
    await run("UPDATE tickets SET status = 'cancelled' WHERE order_id = ?", o.id);
    await run("UPDATE batches SET sold = sold - ? WHERE id = ?", o.quantity, o.batch_id);
  });
}

/** Reconsulta o provedor (Pix e cartões em análise) e atualiza o pedido. Usado pelo webhook e pelo polling do checkout. */
export async function syncPayment(o: OrderRow, opts: { checkRefund?: boolean } = {}) {
  if (o.payment_provider !== payments.name) return o;
  if (o.status !== "pending" && o.status !== "paid") return o;

  // Cartões em análise: resolvidos mesmo se o pedido já foi pago por outro meio
  // (aí o confirmPayment estorna a cobrança repetida).
  const cards = await all<OrderPaymentRow>("SELECT * FROM order_payments WHERE order_id = ? AND status = 'pending'", o.id);
  for (const c of cards) {
    const s = await payments.status(c.id);
    if (s === "pending") continue;
    await run("UPDATE order_payments SET status = ? WHERE id = ?", s === "approved" ? "approved" : "rejected", c.id);
    if (s === "approved") await confirmPayment(o.id, c.id);
  }

  if (o.status === "paid") {
    if (opts.checkRefund) {
      // Webhook: estorno/contestação do pagamento que quitou o pedido → cancela os ingressos.
      if (o.paid_payment_id && (await payments.status(o.paid_payment_id)) === "refunded") await markRefunded(o.id);
      // Pix pago depois que o cartão já tinha quitado (os dois ao mesmo tempo) → estorna o Pix.
      else if (o.payment_id && o.payment_id !== o.paid_payment_id && (await payments.status(o.payment_id)) === "approved")
        await confirmPayment(o.id, o.payment_id);
    }
    return (await one<OrderRow>("SELECT * FROM orders WHERE id = ?", o.id))!;
  }

  if (o.payment_id) {
    const s = await payments.status(o.payment_id);
    if (s === "approved") await confirmPayment(o.id, o.payment_id);
    else if ((s === "rejected" || s === "cancelled") && !cards.length) {
      const cur = (await one<OrderRow>("SELECT * FROM orders WHERE id = ?", o.id))!;
      if (cur.status === "pending") await releaseOrder(o.id, "cancelled");
    }
  }
  return (await one<OrderRow>("SELECT * FROM orders WHERE id = ?", o.id))!;
}

// Motivos de recusa do cartão (Mercado Pago), em português simples.
const CARD_REJECTIONS: Record<string, string> = {
  cc_rejected_insufficient_amount: "Saldo ou limite insuficiente. Tente outro cartão ou pague com Pix.",
  cc_rejected_bad_filled_security_code: "Código de segurança (CVV) incorreto. Confira e tente de novo.",
  cc_rejected_bad_filled_date: "Data de validade incorreta. Confira e tente de novo.",
  cc_rejected_bad_filled_card_number: "Número do cartão incorreto. Confira e tente de novo.",
  cc_rejected_bad_filled_other: "Algum dado do cartão está incorreto. Confira e tente de novo.",
  cc_rejected_call_for_authorize: "O banco precisa autorizar esta compra. Ligue para o seu banco e tente de novo.",
  cc_rejected_card_disabled: "Este cartão está desativado. Ligue para o banco ou use outro cartão.",
  cc_rejected_duplicated_payment: "Você já fez um pagamento igual agora há pouco. Confira em Meus ingressos.",
  cc_rejected_high_risk: "O pagamento foi recusado por segurança. Tente outro cartão ou pague com Pix.",
  cc_rejected_max_attempts: "Muitas tentativas com este cartão. Use outro cartão ou pague com Pix.",
  cc_rejected_blacklist: "Este cartão não pode ser usado. Tente outro cartão ou pague com Pix.",
};

export const MAX_INSTALLMENTS = 12;

export type CardInput = Pick<CardPaymentInput, "token" | "paymentMethodId" | "issuerId" | "installments" | "identification"> & {
  payerEmail?: string | undefined;
};

/** Paga um pedido pendente com cartão. O valor cobrado vem sempre do servidor, nunca do navegador. */
export async function payWithCard(userId: string, orderId: string, input: CardInput) {
  const o = await one<OrderRow>("SELECT * FROM orders WHERE id = ?", orderId);
  if (!o) throw notFound("Pedido não encontrado.");
  if (o.user_id !== userId) throw forbidden();
  if (o.status === "paid") return o;
  if (o.status !== "pending") throw conflict("ORDER_NOT_PENDING", "Este pedido não está mais aguardando pagamento.");
  if (o.expires_at < now()) throw conflict("ORDER_EXPIRED", "O tempo para pagar este pedido acabou. Faça o pedido de novo.");
  if (await one("SELECT 1 FROM order_payments WHERE order_id = ? AND method = 'card' AND status = 'pending'", o.id))
    throw conflict("CARD_IN_REVIEW", "Já existe um pagamento com cartão em análise para este pedido. Aguarde alguns instantes.");
  if (!Number.isInteger(input.installments) || input.installments < 1 || input.installments > MAX_INSTALLMENTS)
    throw badRequest("INVALID_INSTALLMENTS", "Parcelamento inválido.");

  const user = (await one<{ email: string }>("SELECT email FROM users WHERE id = ?", userId))!;
  const ev = await one<{ title: string }>("SELECT title FROM events WHERE id = ?", o.event_id);
  let r;
  try {
    r = await payments.createCard({
      token: input.token, paymentMethodId: input.paymentMethodId, issuerId: input.issuerId,
      installments: input.installments, identification: input.identification,
      orderId: o.id, amountCents: o.total, description: `Ingresso — ${ev?.title ?? "Passe"}`,
      payerEmail: input.payerEmail || user.email,
    });
  } catch (e) {
    console.error("Falha ao cobrar no cartão o pedido", o.id, e);
    throw new HttpError(502, "PAYMENT_UNAVAILABLE", "Não conseguimos processar o cartão agora. Nada foi cobrado. Tente de novo ou pague com Pix.");
  }
  await run(
    "INSERT INTO order_payments (id, order_id, provider, method, status, status_detail, installments, created_at) VALUES (?,?,?,?,?,?,?,?)",
    r.id, o.id, payments.name, "card", r.status, r.statusDetail, input.installments, now(),
  );
  if (r.status === "rejected")
    throw new HttpError(402, "CARD_REJECTED", CARD_REJECTIONS[r.statusDetail] ?? "O cartão foi recusado. Tente outro cartão ou pague com Pix.");
  if (r.status === "approved") await confirmPayment(o.id, r.id);
  return (await one<OrderRow>("SELECT * FROM orders WHERE id = ?", o.id))!;
}

/** Acha o pedido de um pagamento (Pix guardado no pedido ou cartão na tabela de tentativas). Usado pelo webhook. */
export async function findOrderByPayment(paymentId: string) {
  return (await one<OrderRow>("SELECT * FROM orders WHERE payment_provider = ? AND (payment_id = ? OR id IN (SELECT order_id FROM order_payments WHERE id = ?))",
    payments.name, paymentId, paymentId));
}

/**
 * Remove um evento do organizador.
 * - Sem nenhum ingresso pago: apaga tudo (evento, lotes, pedidos em aberto).
 * - Com vendas: cancela o evento (some do site), estorna cada compra paga e cancela os ingressos.
 */
export async function removeEvent(eventId: string) {
  const pending = await all<OrderRow>("SELECT * FROM orders WHERE event_id = ? AND status = 'pending'", eventId);
  for (const o of pending) {
    if (o.payment_id) await payments.cancel(o.payment_id).catch(() => undefined);
    await releaseOrder(o.id, "cancelled");
  }

  const paid = await all<OrderRow>("SELECT * FROM orders WHERE event_id = ? AND status = 'paid'", eventId);
  if (!paid.length) {
    await tx(async () => {
      await run("DELETE FROM checkins WHERE event_id = ?", eventId);
      await run("DELETE FROM tickets WHERE event_id = ?", eventId);
      await run("DELETE FROM order_payments WHERE order_id IN (SELECT id FROM orders WHERE event_id = ?)", eventId);
      await run("DELETE FROM orders WHERE event_id = ?", eventId);
      await run("DELETE FROM events WHERE id = ?", eventId); // lotes e equipe saem junto (ON DELETE CASCADE)
    });
    return { deleted: true, refunded: 0, refundFailed: 0, errors: [] as string[] };
  }

  await run("UPDATE events SET status = 'cancelled' WHERE id = ?", eventId);
  let refunded = 0, refundFailed = 0;
  const errors: string[] = [];
  for (const o of paid) {
    const paymentId = o.paid_payment_id ?? o.payment_id;
    try {
      if (paymentId && o.total > 0) await payments.refund(paymentId);
      await markRefunded(o.id);
      refunded++;
      const buyer = await one<{ email: string; name: string }>("SELECT email, name FROM users WHERE id = ?", o.user_id);
      const ev = await one<{ title: string }>("SELECT title FROM events WHERE id = ?", eventId);
      if (buyer && ev) await sendEmail(eventCancelledEmail(buyer.email, buyer.name, ev.title, o.total));
    } catch (e) {
      refundFailed++;
      errors.push(e instanceof Error ? e.message : String(e));
      console.error(`ATENÇÃO: estorne manualmente o pedido ${o.id} (pagamento ${paymentId}) do evento cancelado ${eventId}:`, e);
    }
  }
  return { deleted: false, refunded, refundFailed, errors };
}

/** Manda o e-mail de "compra confirmada" com o resumo e o link para os QR Codes. */
export async function notifyPaid(orderId: string) {
  const d = await one<{
    id: string; total: number; email: string; name: string; title: string; starts_at: string; venue: string; city: string; batch: string;
  }>(`SELECT o.id, o.total, u.email, u.name, e.title, e.starts_at, e.venue, e.city, b.name batch
      FROM orders o JOIN users u ON u.id = o.user_id JOIN events e ON e.id = o.event_id JOIN batches b ON b.id = o.batch_id
      WHERE o.id = ?`, orderId);
  if (!d) return;
  const holders = (await all<{ holder_name: string }>("SELECT holder_name FROM tickets WHERE order_id = ? ORDER BY created_at", orderId)).map((t) => t.holder_name);
  await sendEmail(purchaseEmail({
    to: d.email, name: d.name, orderId: d.id, eventTitle: d.title, startsAt: d.starts_at, venue: d.venue, city: d.city,
    batchName: d.batch, total: d.total, holders,
  }));
}
