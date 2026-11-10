import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { all, now, one } from "../db.js";
import { approveOrder, cancelOwnOrder, createOrder, MAX_INSTALLMENTS, notifyPaid, payWithCard, releaseOrder, syncPayment, toOrder, type OrderRow } from "../domain/orders.js";
import { forbidden, HttpError, notFound } from "../lib/errors.js";
import { parse, rateLimit, requireAuth, user } from "../lib/http.js";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

const createSchema = z.object({
  eventId: z.string().min(1),
  batchId: z.string().min(1),
  holders: z.array(z.object({ name: z.string(), cpf: z.string() })).min(1),
  accessCode: z.string().max(60).optional(),
  couponCode: z.string().max(40).optional(),
});

ordersRouter.post("/", rateLimit({ windowMs: 60_000, max: config.isTest ? 1000 : 20, key: (r) => `order:${r.auth?.id}` }), async (req, res) => {
  const o = await createOrder(user(req).id, parse(createSchema, req.body));
  res.status(201).json(await toOrder(o));
});

ordersRouter.get("/", async (req, res) => {
  const rows = await all<OrderRow>("SELECT * FROM orders WHERE user_id = ? AND kind = 'sale' ORDER BY created_at DESC", user(req).id);
  res.json(await Promise.all(rows.map(toOrder)));
});

async function own(userId: string, id: string) {
  const o = await one<OrderRow>("SELECT * FROM orders WHERE id = ?", id);
  if (!o) throw notFound("Pedido não encontrado.");
  if (o.user_id !== userId) throw forbidden();
  return o;
}

/** O checkout faz polling aqui enquanto o Pix não é pago. */
ordersRouter.get("/:id", async (req, res) => {
  let o = await own(user(req).id, req.params.id);
  if (o.status === "pending") o = await syncPayment(o).catch(() => o);
  // Reserva vencida e ainda não paga: devolve os ingressos para a venda.
  if (o.status === "pending" && o.expires_at < now()) {
    await releaseOrder(o.id, "expired");
    o = await own(user(req).id, o.id);
  }
  res.json(await toOrder(o));
});

ordersRouter.post("/:id/cancel", async (req, res) => {
  await cancelOwnOrder(user(req).id, req.params.id);
  res.json(await toOrder(await own(user(req).id, req.params.id)));
});

/** Pagamento com cartão: o navegador manda só o token do cartão (gerado pelo formulário seguro do Mercado Pago). */
const cardSchema = z.object({
  token: z.string().min(8).max(200),
  paymentMethodId: z.string().min(2).max(40),
  issuerId: z.union([z.string(), z.number()]).transform(String).optional(),
  installments: z.coerce.number().int().min(1).max(MAX_INSTALLMENTS),
  payer: z.object({
    email: z.string().email().optional(),
    identification: z.object({ type: z.string().max(10), number: z.string().max(20) }).optional(),
  }).optional(),
});

ordersRouter.post("/:id/card", rateLimit({ windowMs: 60_000, max: 10, key: (r) => `card:${r.auth?.id}` }), async (req, res) => {
  const d = parse(cardSchema, req.body);
  const o = await payWithCard(user(req).id, String(req.params.id), {
    token: d.token, paymentMethodId: d.paymentMethodId, issuerId: d.issuerId, installments: d.installments,
    identification: d.payer?.identification, payerEmail: d.payer?.email,
  });
  res.json(await toOrder(o));
});

/** Só no modo de pagamento simulado (desenvolvimento): finge que o Pix foi pago. */
ordersRouter.post("/:id/simulate-payment", async (req, res) => {
  if (config.paymentProvider !== "mock") throw new HttpError(404, "NOT_FOUND", "Não encontrado.");
  const o = await own(user(req).id, req.params.id);
  if (o.status !== "pending") throw new HttpError(409, "ORDER_NOT_PENDING", "Pedido não está aguardando pagamento.");
  if ((await approveOrder(o.id)).justPaid) await notifyPaid(o.id);
  res.json(await toOrder(await own(user(req).id, o.id)));
});
