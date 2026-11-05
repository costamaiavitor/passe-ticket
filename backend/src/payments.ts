import { createHmac, randomUUID } from "node:crypto";
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

export interface PaymentProvider {
  name: string;
  create(input: { orderId: string; amountCents: number; description: string; payerEmail: string; expiresAt: string }): Promise<CreatedPayment>;
  /** Consulta o status real no provedor (nunca confie só no corpo do webhook). */
  status(paymentId: string): Promise<"approved" | "pending" | "rejected" | "cancelled" | "refunded">;
}

const mock: PaymentProvider = {
  name: "mock",
  async create({ orderId }) {
    return { id: `mock_${randomUUID()}`, info: { method: "pix", pixCode: `00020126PIXSIMULADO${orderId}` } };
  },
  async status() {
    return "pending";
  },
};

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
        notification_url: `${config.publicUrl}/api/v1/webhooks/mercadopago`,
      }),
    });
    const td = p.point_of_interaction?.transaction_data ?? {};
    return {
      id: String(p.id),
      info: { method: "pix", pixCode: td.qr_code ?? "", ...(td.qr_code_base64 ? { pixQrBase64: td.qr_code_base64 } : {}), ...(td.ticket_url ? { ticketUrl: td.ticket_url } : {}) },
    };
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
  return createHmac("sha256", config.mpWebhookSecret).update(manifest).digest("hex") === parts["v1"];
}

export const payments: PaymentProvider = config.paymentProvider === "mercadopago" ? mercadopago : mock;
