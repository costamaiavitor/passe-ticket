import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { all, now, one } from "../db.js";
import { approveOrder, cancelOwnOrder, createOrder, releaseOrder, syncPayment, toOrder, type OrderRow } from "../domain/orders.js";
import { forbidden, HttpError, notFound } from "../lib/errors.js";
import { parse, rateLimit, requireAuth, user } from "../lib/http.js";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

const createSchema = z.object({
  eventId: z.string().min(1),
  batchId: z.string().min(1),
  holders: z.array(z.object({ name: z.string(), cpf: z.string() })).min(1),
});

ordersRouter.post("/", rateLimit({ windowMs: 60_000, max: 20, key: (r) => `order:${r.auth?.id}` }), async (req, res) => {
  const o = await createOrder(user(req).id, parse(createSchema, req.body));
  res.status(201).json(await toOrder(o));
});

ordersRouter.get("/", async (req, res) => {
  const rows = await all<OrderRow>("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", user(req).id);
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

/** Só no modo de pagamento simulado (desenvolvimento): finge que o Pix foi pago. */
ordersRouter.post("/:id/simulate-payment", async (req, res) => {
  if (config.paymentProvider !== "mock") throw new HttpError(404, "NOT_FOUND", "Não encontrado.");
  const o = await own(user(req).id, req.params.id);
  if (o.status !== "pending") throw new HttpError(409, "ORDER_NOT_PENDING", "Pedido não está aguardando pagamento.");
  await approveOrder(o.id);
  res.json(await toOrder(await own(user(req).id, o.id)));
});
