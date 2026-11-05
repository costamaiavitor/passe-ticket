import { Router } from "express";
import { findOrderByPayment, syncPayment } from "../domain/orders.js";
import { verifyMercadoPagoSignature } from "../payments.js";

export const webhooksRouter = Router();

/** Notificação do Mercado Pago. Sempre reconsultamos o pagamento na API antes de liberar ingressos. */
webhooksRouter.post("/mercadopago", async (req, res) => {
  const dataId = String(req.query["data.id"] ?? req.body?.data?.id ?? "");
  if (!dataId) return void res.status(200).end();
  if (!verifyMercadoPagoSignature(req.headers, dataId)) return void res.status(401).end();
  const o = await findOrderByPayment(dataId);
  // checkRefund: o webhook também avisa estornos e contestações de pedidos já pagos.
  if (o) await syncPayment(o, { checkRefund: true });
  res.status(200).end();
});
