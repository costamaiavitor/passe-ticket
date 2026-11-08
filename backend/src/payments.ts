import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";

export interface PaymentInfo {
  method: "pix";
  /** Código Pix copia-e-cola */
  pixCode: string;
  /** PNG do QR Pix em base64 (sem prefixo data:) quando o provedor fornece */
  pixQrBase64?: string;
  ticketUrl?: string;
}

export interface CreatedPayment { id: string; info: PaymentInfo }

export type PaymentStatus = "approved" | "pending" | "rejected" | "cancelled" | "refunded";

export interface CardPaymentInput {
  orderId: string;
  amountCents: number;
  description: string;
  payerEmail: string;
  /** Token do cartão gerado pelo formulário seguro do Mercado Pago no navegador (o número do cartão nunca chega aqui). */
  token: string;
  paymentMethodId: string;
  issuerId?: string | undefined;
  installments: number;
  identification?: { type: string; number: string } | undefined;
}

export interface CardPaymentResult { id: string; status: "approved" | "pending" | "rejected"; statusDetail: string }

export interface PaymentProvider {
  name: string;
  create(input: { orderId: string; amountCents: number; description: string; payerEmail: string; expiresAt: string }): Promise<CreatedPayment>;
  createCard(input: CardPaymentInput): Promise<CardPaymentResult>;
  /** Consulta o status real no provedor (nunca confie só no corpo do webhook). */
  status(paymentId: string): Promise<PaymentStatus>;
  /** Cancela um pagamento ainda não pago (ex.: o Pix, quando o cliente pagou no cartão). */
  cancel(paymentId: string): Promise<void>;
  /** Devolve o dinheiro de um pagamento aprovado (ex.: pedido pago duas vezes). */
  refund(paymentId: string): Promise<void>;
}

const mock: PaymentProvider = {
  name: "mock",
  async create({ orderId }) {
    return { id: `mock_${randomUUID()}`, info: { method: "pix", pixCode: `00020126PIXSIMULADO${orderId}` } };
  },
  // Cartão simulado (testes/desenvolvimento): token "approve" aprova, "pending" fica em análise, o resto é recusado.
  async createCard({ token }) {
    const id = `mockcard_${randomUUID()}`;
    if (token.startsWith("approve")) return { id, status: "approved", statusDetail: "accredited" };
    if (token.startsWith("pending")) return { id, status: "pending", statusDetail: "pending_contingency" };
    return { id, status: "rejected", statusDetail: "cc_rejected_insufficient_amount" };
  },
  async status(id) {
    return mockStatuses.get(id) ?? "pending";
  },
  async cancel(id) { mockStatuses.set(id, "cancelled"); },
  async refund(id) { mockStatuses.set(id, "refunded"); },
};

/** Só para testes: muda o status de um pagamento simulado. */
export const mockStatuses = new Map<string, PaymentStatus>();

// ---- Mercado Pago (Pix) — https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post
const MP = "https://api.mercadopago.com";

async function mpFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${MP}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.mpAccessToken}`, "Content-Type": "application/json", ...init.headers },
  });
  const body = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${body.message ?? "erro"}`);
  return body;
}

interface MpPayment {
  id: number;
  status: string;
  status_detail?: string;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } };
}

const mercadopago: PaymentProvider = {
  name: "mercadopago",
  async create({ orderId, amountCents, description, payerEmail, expiresAt }) {
    const p = await mpFetch<MpPayment>("/v1/payments", {
      method: "POST",
      headers: { "X-Idempotency-Key": orderId },
      body: JSON.stringify({
        transaction_amount: amountCents / 100,
        description,
        payment_method_id: "pix",
        payer: { email: payerEmail },
        external_reference: orderId,
        date_of_expiration: expiresAt,
        // O Mercado Pago só aceita aviso em endereço público com https; sem ele, o checkout confirma pelo polling.
        ...(config.publicUrl.startsWith("https://") ? { notification_url: `${config.publicUrl}/api/v1/webhooks/mercadopago` } : {}),
      }),
    });
    const td = p.point_of_interaction?.transaction_data ?? {};
    return {
      id: String(p.id),
      info: { method: "pix", pixCode: td.qr_code ?? "", ...(td.qr_code_base64 ? { pixQrBase64: td.qr_code_base64 } : {}), ...(td.ticket_url ? { ticketUrl: td.ticket_url } : {}) },
    };
  },
  async createCard(i) {
    const p = await mpFetch<MpPayment>("/v1/payments", {
      method: "POST",
      // Mesma tentativa (mesmo token) nunca cobra duas vezes.
      headers: { "X-Idempotency-Key": `${i.orderId}-${createHash("sha256").update(i.token).digest("hex").slice(0, 24)}` },
      body: JSON.stringify({
        transaction_amount: i.amountCents / 100,
        token: i.token,
        description: i.description,
        installments: i.installments,
        payment_method_id: i.paymentMethodId,
        ...(i.issuerId ? { issuer_id: Number(i.issuerId) || i.issuerId } : {}),
        payer: { email: i.payerEmail, ...(i.identification ? { identification: i.identification } : {}) },
        external_reference: i.orderId,
        statement_descriptor: "PASSE",
        ...(config.publicUrl.startsWith("https://") ? { notification_url: `${config.publicUrl}/api/v1/webhooks/mercadopago` } : {}),
      }),
    });
    const status = p.status === "approved" ? "approved" : p.status === "rejected" || p.status === "cancelled" ? "rejected" : "pending";
    return { id: String(p.id), status, statusDetail: p.status_detail ?? "" };
  },
  async cancel(id) {
    await mpFetch(`/v1/payments/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) });
  },
  async refund(id) {
    await mpFetch(`/v1/payments/${encodeURIComponent(id)}/refunds`, { method: "POST", headers: { "X-Idempotency-Key": `refund-${id}` }, body: "{}" });
  },
  async status(id) {
    const p = await mpFetch<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`);
    if (p.status === "approved") return "approved";
    if (p.status === "rejected") return "rejected";
    if (p.status === "cancelled") return "cancelled";
    if (p.status === "refunded" || p.status === "charged_back") return "refunded";
    return "pending";
  },
};

/** Valida o cabeçalho x-signature do webhook do Mercado Pago. */
export function verifyMercadoPagoSignature(headers: Record<string, string | string[] | undefined>, dataId: string): boolean {
  if (!config.mpWebhookSecret) return !config.isProd; // sem segredo só aceitamos fora de produção
  const sig = String(headers["x-signature"] ?? "");
  const requestId = String(headers["x-request-id"] ?? "");
  const parts = Object.fromEntries(sig.split(",").map((kv) => kv.trim().split("=") as [string, string]));
  if (!parts["ts"] || !parts["v1"]) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts["ts"]};`;
  const expected = Buffer.from(createHmac("sha256", config.mpWebhookSecret).update(manifest).digest("hex"));
  const got = Buffer.from(parts["v1"]);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export const payments: PaymentProvider = config.paymentProvider === "mercadopago" ? mercadopago : mock;
