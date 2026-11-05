import { Router } from "express";
import { one } from "../db.ts";
import { syncPayment, type OrderRow } from "../domain/orders.ts";
import { verifyMercadoPagoSignature } from "../payments.ts";

export const webhooksRouter = Router();

/** Notificação do Mercado Pago. Sempre reconsultamos o pagamento na API antes de liberar ingressos. */
webhooksRouter.post("/mercadopago", async (req, res) => {
  const dataId = String(req.query["data.id"] ?? req.body?.data?.id ?? "");
  if (!dataId) return void res.status(200).end();
  if (!verifyMercadoPagoSignature(req.headers, dataId)) return void res.status(401).end();
  const o = one<OrderRow>("SELECT * FROM orders WHERE payment_provider = 'mercadopago' AND payment_id = ?", dataId);
  if (o) await syncPayment(o);
  res.status(200).end();
});
