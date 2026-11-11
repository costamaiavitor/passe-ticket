import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { all, now, one, run, tx } from "../db.js";
import { isValidCpf, onlyDigits } from "../lib/cpf.js";
import { badRequest, conflict, forbidden, HttpError, notFound } from "../lib/errors.js";
import { payments, type CardPaymentInput, type PaymentInfo } from "../payments.js";
import { eventCancelledEmail, purchaseEmail, sendEmail } from "../lib/email.js";
import { batchStatuses, normalizeCode, type BatchRow, type EventRow } from "./events.js";
import { discountFor, findUsableCoupon } from "./promos.js";
import { authForOrder, sellerAuth } from "./mpaccounts.js";

export interface OrderRow {
  id: string; user_id: string; event_id: string; batch_id: string; quantity: number; unit_price: number;
  subtotal: number; fee: number; total: number;
  status: "pending" | "paid" | "expired" | "cancelled" | "refund_required" | "refunded";
  payment_provider: string; payment_id: string | null; payment_data: string; expires_at: string;
  paid_at: string | null; created_at: string; paid_payment_id: string | null;
  coupon_id?: string | null; discount?: number; kind?: "sale" | "courtesy";
  /** Split 1:1: organizador em cuja conta Mercado Pago o pagamento foi criado (null = conta do BooTickets). */
  seller_id?: string | null; application_fee?: number;
  /** Só no retorno de approveOrder: o pedido acabou de ser pago nesta chamada. */
  justPaid?: boolean;
}

interface OrderPaymentRow { id: string; order_id: string; method: string; status: string; status_detail: string }

export const platformFee = (subtotal: number) => Math.round(subtotal * config.feeRate);

/** Quantos ingressos de cada lote o pedido tem (o carrinho pode misturar lotes). */
export async function orderBatches(orderId: string, statuses?: string[]) {
  const where = statuses ? ` AND status IN (${statuses.map(() => "?").join(",")})` : "";
  return all<{ batch_id: string; n: number }>(
    `SELECT batch_id, COUNT(*)::int n FROM tickets WHERE order_id = ?${where} GROUP BY batch_id ORDER BY batch_id`, orderId, ...(statuses ?? []));
}

export async function toOrder(o: OrderRow) {
  const ev = await one<{ title: string; slug: string; starts_at: string }>("SELECT title, slug, starts_at FROM events WHERE id = ?", o.event_id);
  // Itens do pedido: um por lote, na ordem em que aparecem no evento (pedidos antigos têm um lote só).
  const rows = await all<{ batch_id: string; name: string; n: number; unit: number | null }>(
    `SELECT t.batch_id, b.name, COUNT(*)::int n, MAX(t.list_price) unit
       FROM tickets t JOIN batches b ON b.id = t.batch_id WHERE t.order_id = ? GROUP BY t.batch_id, b.name, b.position ORDER BY b.position, b.name`, o.id);
  const items = rows.length
    ? rows.map((r) => ({ batchId: r.batch_id, batchName: r.name, quantity: r.n, unitPrice: r.unit ?? o.unit_price }))
    : [{ batchId: o.batch_id, batchName: (await one<{ name: string }>("SELECT name FROM batches WHERE id = ?", o.batch_id))?.name ?? "",
         quantity: o.quantity, unitPrice: o.unit_price }];
  return {
    id: o.id, status: o.status, eventId: o.event_id, eventTitle: ev?.title ?? "", eventSlug: ev?.slug ?? "",
    eventStartsAt: ev?.starts_at ?? "", batchId: o.batch_id,
    batchName: items.length > 1 ? items.map((i) => `${i.quantity}× ${i.batchName}`).join(" + ") : items[0]!.batchName,
    quantity: o.quantity, items,
    // subtotal = valor dos ingressos antes do desconto; discount = desconto do cupom (o total já vem com ele).
    unitPrice: o.unit_price, subtotal: o.subtotal + (o.discount ?? 0), discount: o.discount ?? 0, fee: o.fee, total: o.total,
    couponCode: o.coupon_id ? (await one<{ code: string }>("SELECT code FROM coupons WHERE id = ?", o.coupon_id))?.code ?? null : null,
    payment: o.status === "pending" ? (JSON.parse(o.payment_data) as PaymentInfo) : null,
    // Cartão em análise pelo Mercado Pago: o checkout mostra "pagamento em análise" e continua consultando.
    cardPending: o.status === "pending"
      ? !!(await one("SELECT 1 FROM order_payments WHERE order_id = ? AND method = 'card' AND status = 'pending'", o.id))
      : false,
    paymentProvider: o.payment_provider, expiresAt: o.expires_at, paidAt: o.paid_at, createdAt: o.created_at,
  };
}

export interface Holder { name: string; cpf: string }
export interface CartItem { batchId: string; holders: Holder[] }

/**
 * Cria o pedido reservando o estoque. Aceita um lote só (batchId + holders) ou o carrinho (items: vários lotes).
 * Regras de CPF, estoque e janela de vendas são validadas aqui.
 */
export async function createOrder(userId: string, input: {
  eventId: string; batchId?: string | undefined; holders?: Holder[] | undefined; items?: CartItem[] | undefined;
  accessCode?: string | undefined; couponCode?: string | undefined;
}) {
  await expireStaleOrders();
  // Junta os itens por lote (o mesmo lote duas vezes vira um item só).
  const raw: CartItem[] = input.items?.length ? input.items : input.batchId ? [{ batchId: input.batchId, holders: input.holders ?? [] }] : [];
  const byBatch = new Map<string, Holder[]>();
  for (const it of raw) byBatch.set(it.batchId, [...(byBatch.get(it.batchId) ?? []), ...it.holders]);
  const items = [...byBatch].map(([batchId, hs]) => ({ batchId, holders: hs.map((h) => ({ name: h.name.trim(), cpf: onlyDigits(h.cpf) })) }))
    .filter((it) => it.holders.length > 0);
  const holders = items.flatMap((it) => it.holders);
  if (!items.length || holders.length < 1 || holders.length > config.maxTicketsPerOrder)
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
    if (ev.access_code && normalizeCode(input.accessCode ?? "") !== normalizeCode(ev.access_code))
      throw new HttpError(403, "ACCESS_CODE", "Palavra-senha incorreta. Peça a senha para o organizador do evento.");
    const siblings = await all<BatchRow>("SELECT * FROM batches WHERE event_id = ? ORDER BY id FOR UPDATE", ev.id);
    const statuses = batchStatuses(siblings);
    const lines: { b: BatchRow; holders: Holder[] }[] = [];
    for (const it of items) {
      const b = siblings.find((x) => x.id === it.batchId);
      if (!b) throw notFound("Lote não encontrado.");
      const st = statuses.get(b.id);
      if (st === "soldout") throw conflict("SOLD_OUT", `O lote ${b.name} esgotou.`);
      if (st === "upcoming") throw conflict("BATCH_UPCOMING", `O lote ${b.name} abre quando o lote anterior esgotar.`);
      if (st !== "active") throw conflict("BATCH_UNAVAILABLE", `O lote ${b.name} não está à venda no momento.`);
      if (b.total - b.sold - b.reserved < it.holders.length)
        throw conflict("NOT_ENOUGH_STOCK", `Restam apenas ${b.total - b.sold - b.reserved} ingressos no lote ${b.name}.`);
      lines.push({ b, holders: it.holders });
    }

    // Limite de ingressos por CPF no evento (conta ingressos ativos + reservas pendentes).
    const perCpf = new Map<string, number>();
    for (const h of holders) perCpf.set(h.cpf, (perCpf.get(h.cpf) ?? 0) + 1);
    for (const [cpf, n] of perCpf) {
      const { c } = (await one<{ c: number }>(
        "SELECT COUNT(*) c FROM tickets WHERE event_id = ? AND holder_cpf = ? AND status IN ('pending','valid','used')", ev.id, cpf,
      ))!;
      if (Number(c) + n > ev.max_per_cpf)
        throw conflict("CPF_LIMIT", `O CPF ${cpf.slice(0, 3)}.***.***-${cpf.slice(9)} atingiu o limite de ${ev.max_per_cpf} ingressos neste evento.`);
    }

    // Cupom: o desconto sai do valor do ingresso (o organizador recebe menos); a taxa é calculada sobre o valor já com desconto.
    // No carrinho, vale para todos os ingressos do pedido (o limite de usos conta cada ingresso).
    const coupon = input.couponCode?.trim() ? await findUsableCoupon(ev.id, input.couponCode, holders.length, true) : null;
    const priced = lines.map((l) => {
      const d = coupon ? discountFor(coupon, l.b.price, l.holders.length) : 0;
      // Divide o desconto entre os ingressos do lote (o resto de centavos fica no primeiro).
      const each = Math.floor(d / l.holders.length);
      return { ...l, discount: d, ticketPrices: l.holders.map((_, i) => l.b.price - each - (i === 0 ? d - each * l.holders.length : 0)) };
    });
    const discount = priced.reduce((s, l) => s + l.discount, 0);

    const id = randomUUID();
    const gross = priced.reduce((s, l) => s + l.b.price * l.holders.length, 0);
    const subtotal = gross - discount;
    const fee = platformFee(subtotal);
    const t = now();
    const expires = new Date(Date.now() + config.reservationMinutes * 60_000).toISOString();
    const first = priced[0]!.b;
    for (const l of priced) await run("UPDATE batches SET reserved = reserved + ? WHERE id = ?", l.holders.length, l.b.id);
    await run(
      `INSERT INTO orders (id, user_id, event_id, batch_id, quantity, unit_price, subtotal, fee, total, status, payment_provider, expires_at, created_at, coupon_id, discount)
       VALUES (?,?,?,?,?,?,?,?,?, 'pending', ?, ?, ?, ?, ?)`,
      id, userId, ev.id, first.id, holders.length, priced.length === 1 ? first.price : Math.round(gross / holders.length),
      subtotal, fee, subtotal + fee, payments.name, expires, t, coupon?.id ?? null, discount,
    );
    for (const l of priced)
      for (const [i, h] of l.holders.entries())
        await run(
          `INSERT INTO tickets (id, order_id, event_id, batch_id, owner_id, holder_name, holder_cpf, status, created_at, price, list_price)
           VALUES (?,?,?,?,?,?,?, 'pending', ?, ?, ?)`,
          randomUUID(), id, ev.id, l.b.id, userId, h.name, h.cpf, t, l.ticketPrices[i]!, l.b.price,
        );
    const title = priced.length === 1 ? `${ev.title} — ${first.name}` : `${ev.title} — ${holders.length} ingressos`;
    return { id, total: subtotal + fee, fee, title, expires, organizerId: ev.organizer_id };
  });

  // Ingresso gratuito: aprova direto.
  if (order.total === 0) {
    if ((await approveOrder(order.id)).justPaid) await notifyPaid(order.id);
    return (await one<OrderRow>("SELECT * FROM orders WHERE id = ?", order.id))!;
  }

  // Split 1:1: organizador com Mercado Pago conectado recebe direto; a taxa do BooTickets sai automaticamente.
  const seller = await sellerAuth(order.organizerId).catch(() => null);
  const base = { orderId: order.id, amountCents: order.total, description: order.title, payerEmail: buyer.email, expiresAt: order.expires };
  try {
    let p;
    let sellerId: string | null = null;
    if (seller) {
      try {
        p = await payments.create({ ...base, split: { ...seller, applicationFeeCents: order.fee } });
        sellerId = order.organizerId;
      } catch (e) {
        // Conta do organizador com problema (ex.: acesso revogado): a venda não para — cai na conta do BooTickets
        // e entra no repasse manual.
        console.error(`Split indisponível para o organizador ${order.organizerId}; cobrando na conta do BooTickets:`, e);
      }
    }
    p ??= await payments.create(base);
    await run("UPDATE orders SET payment_id = ?, payment_data = ?, seller_id = ?, application_fee = ? WHERE id = ?",
      p.id, JSON.stringify(p.info), sellerId, sellerId ? order.fee : 0, order.id);
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
    // Evento cancelado: não emite ingresso; o pagamento será estornado por quem chamou (confirmPayment).
    const evStatus = (await one<{ status: string }>("SELECT status FROM events WHERE id = ?", o.event_id))?.status;
    if (evStatus === "cancelled") {
      await run("UPDATE orders SET status = 'refund_required' WHERE id = ?", o.id);
      return { ...o, status: "refund_required" as const };
    }
    const t = now();
    const lines = await orderBatches(o.id);
    if (o.status === "pending") {
      for (const l of lines) await run("UPDATE batches SET reserved = reserved - ?, sold = sold + ? WHERE id = ?", l.n, l.n, l.batch_id);
    } else {
      // Pagamento chegou depois que a reserva expirou: tenta reservar de novo (todos os lotes do pedido ou nenhum).
      for (const l of lines) {
        const b = (await one<BatchRow>("SELECT * FROM batches WHERE id = ? FOR UPDATE", l.batch_id))!;
        if (b.total - b.sold - b.reserved < l.n) {
          await run("UPDATE orders SET status = 'refund_required' WHERE id = ?", o.id);
          return { ...o, status: "refund_required" as const };
        }
      }
      for (const l of lines) await run("UPDATE batches SET sold = sold + ? WHERE id = ?", l.n, l.batch_id);
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
    for (const l of await orderBatches(o.id, ["pending"])) await run("UPDATE batches SET reserved = reserved - ? WHERE id = ?", l.n, l.batch_id);
    await run("UPDATE orders SET status = ? WHERE id = ?", status, o.id);
    await run("UPDATE tickets SET status = 'cancelled' WHERE order_id = ?", o.id);
  });
}

let lastExpiry = 0;
/** Igual a expireStaleOrders, mas no máximo uma vez a cada 30 s por servidor (usada nas páginas públicas). */
export async function expireStaleOrdersThrottled() {
  if (Date.now() - lastExpiry < 30_000) return 0;
  lastExpiry = Date.now();
  return expireStaleOrders();
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
      await payments.refund(paymentId, await authForOrder(r));
      await run("UPDATE order_payments SET status = 'refunded' WHERE id = ?", paymentId);
      if (r.status === "refund_required") await run("UPDATE orders SET status = 'refunded' WHERE id = ?", orderId);
      console.warn(`Pagamento ${paymentId} do pedido ${orderId} estornado automaticamente (${duplicate ? "pago em dobro" : "sem estoque"}).`);
    } catch (e) {
      console.error(`ATENÇÃO: estorne manualmente o pagamento ${paymentId} do pedido ${orderId}:`, e);
    }
    return;
  }
  // Pagou no cartão: cancela o Pix que ficou em aberto para ninguém pagar duas vezes.
  if (r.payment_id && r.payment_id !== paymentId) await payments.cancel(r.payment_id, await authForOrder(r).catch(() => undefined)).catch(() => undefined);
  if ("justPaid" in r && r.justPaid) await notifyPaid(orderId);
}

/** Estorno ou contestação depois de pago: cancela os ingressos e devolve as vagas ao lote. */
export async function markRefunded(orderId: string) {
  await tx(async () => {
    const o = await one<OrderRow>("SELECT * FROM orders WHERE id = ? FOR UPDATE", orderId);
    if (!o || o.status !== "paid") return;
    // Devolve ao lote só os ingressos que ainda contavam como vendidos (cortesia já revogada não conta de novo).
    const lines = await orderBatches(o.id, ["valid", "used"]);
    await run("UPDATE orders SET status = 'refunded' WHERE id = ?", o.id);
    await run("UPDATE tickets SET status = 'cancelled' WHERE order_id = ?", o.id);
    for (const l of lines) await run("UPDATE batches SET sold = sold - ? WHERE id = ?", l.n, l.batch_id);
  });
}

/** Reconsulta o provedor (Pix e cartões em análise) e atualiza o pedido. Usado pelo webhook e pelo polling do checkout. */
export async function syncPayment(o: OrderRow, opts: { checkRefund?: boolean } = {}) {
  if (o.payment_provider !== payments.name) return o;
  // Pedidos expirados/cancelados também são conferidos: um Pix pago com atraso precisa virar ingresso
  // (se ainda houver vaga) ou estorno — nunca ficar parado na conta.
  if (o.status === "refunded" || o.status === "refund_required") return o;
  // Pagamentos de um pedido com split existem na conta do organizador: consulta com o token dele.
  const auth = await authForOrder(o);

  // Cartões em análise: resolvidos mesmo se o pedido já foi pago por outro meio
  // (aí o confirmPayment estorna a cobrança repetida).
  const cards = await all<OrderPaymentRow>("SELECT * FROM order_payments WHERE order_id = ? AND status = 'pending'", o.id);
  for (const c of cards) {
    const s = await payments.status(c.id, auth);
    if (s === "pending") continue;
    await run("UPDATE order_payments SET status = ? WHERE id = ?", s === "approved" ? "approved" : "rejected", c.id);
    if (s === "approved") await confirmPayment(o.id, c.id);
  }

  if (o.status === "paid") {
    if (opts.checkRefund) {
      // Webhook: estorno/contestação do pagamento que quitou o pedido → cancela os ingressos.
      if (o.paid_payment_id && (await payments.status(o.paid_payment_id, auth)) === "refunded") await markRefunded(o.id);
      // Pix pago depois que o cartão já tinha quitado (os dois ao mesmo tempo) → estorna o Pix.
      else if (o.payment_id && o.payment_id !== o.paid_payment_id && (await payments.status(o.payment_id, auth)) === "approved")
        await confirmPayment(o.id, o.payment_id);
    }
    return (await one<OrderRow>("SELECT * FROM orders WHERE id = ?", o.id))!;
  }

  if (o.payment_id) {
    const s = await payments.status(o.payment_id, auth);
    if (s === "approved") await confirmPayment(o.id, o.payment_id);
    else if ((s === "rejected" || s === "cancelled") && !cards.length && o.status === "pending") {
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
  // O cartão vai para a mesma conta do Pix do pedido (organizador, se houver split).
  const auth = await authForOrder(o);
  let r;
  try {
    r = await payments.createCard({
      split: auth ? { ...auth, applicationFeeCents: o.application_fee ?? 0 } : undefined,
      token: input.token, paymentMethodId: input.paymentMethodId, issuerId: input.issuerId,
      installments: input.installments, identification: input.identification,
      orderId: o.id, amountCents: o.total, description: `Ingresso — ${ev?.title ?? "BooTickets"}`,
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
    if (o.payment_id) await payments.cancel(o.payment_id, await authForOrder(o).catch(() => undefined)).catch(() => undefined);
    await releaseOrder(o.id, "cancelled");
  }

  const paid = await all<OrderRow>("SELECT * FROM orders WHERE event_id = ? AND status = 'paid'", eventId);
  // Só apaga de vez se nunca houve cobrança gerada. Se algum Pix/cartão foi criado, o evento fica como
  // "cancelado": assim um pagamento que chegue atrasado ainda encontra o pedido e é estornado.
  const everCharged = await one(
    `SELECT 1 FROM orders o WHERE o.event_id = ? AND (o.payment_id IS NOT NULL OR o.paid_payment_id IS NOT NULL
       OR EXISTS (SELECT 1 FROM order_payments p WHERE p.order_id = o.id)) LIMIT 1`, eventId);
  if (!paid.length && !everCharged) {
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
      if (paymentId && o.total > 0) await payments.refund(paymentId, await authForOrder(o));
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
  const lines = await all<{ name: string; n: number }>(
    "SELECT b.name, COUNT(*)::int n FROM tickets t JOIN batches b ON b.id = t.batch_id WHERE t.order_id = ? GROUP BY b.name, b.position ORDER BY b.position", orderId);
  if (lines.length > 1) d.batch = lines.map((l) => `${l.n}× ${l.name}`).join(" + ");
  await sendEmail(purchaseEmail({
    to: d.email, name: d.name, orderId: d.id, eventTitle: d.title, startsAt: d.starts_at, venue: d.venue, city: d.city,
    batchName: d.batch, total: d.total, holders,
  }));
}
