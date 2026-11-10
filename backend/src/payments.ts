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

/** Conta onde o pagamento é criado. Sem ela, usa a conta do BooTickets. */
export interface PayAuth { accessToken: string }
/**
 * Split 1:1: o pagamento é criado na conta do organizador (token dele, obtido por OAuth) e
 * applicationFeeCents vai automaticamente para a conta do BooTickets.
 */
export interface Split extends PayAuth { applicationFeeCents: number }

/** Resposta do /oauth/token do Mercado Pago (conectar ou renovar a conta de um organizador). */
export interface OAuthTokens {
  access_token: string; refresh_token: string; user_id: number | string; public_key?: string; expires_in: number; live_mode?: boolean;
}

export type OAuthGrant =
  | { grant_type: "authorization_code"; code: string; redirect_uri: string; code_verifier: string }
  | { grant_type: "refresh_token"; refresh_token: string };

export interface PaymentProvider {
  name: string;
  create(input: { orderId: string; amountCents: number; description: string; payerEmail: string; expiresAt: string; split?: Split | undefined }): Promise<CreatedPayment>;
  createCard(input: CardPaymentInput & { split?: Split | undefined }): Promise<CardPaymentResult>;
  /** Consulta o status real no provedor (nunca confie só no corpo do webhook). */
  status(paymentId: string, auth?: PayAuth): Promise<PaymentStatus>;
  /** Cancela um pagamento ainda não pago (ex.: o Pix, quando o cliente pagou no cartão). */
  cancel(paymentId: string, auth?: PayAuth): Promise<void>;
  /** Devolve o dinheiro de um pagamento aprovado (ex.: pedido pago duas vezes). */
  refund(paymentId: string, auth?: PayAuth): Promise<void>;
  /** Troca o código da autorização (ou o refresh_token) por tokens da conta do organizador. */
  oauthToken(body: OAuthGrant): Promise<OAuthTokens>;
}

// Simulado: guarda em qual conta cada pagamento foi criado, para os testes conferirem o split.
// Como no Mercado Pago real, só a conta dona do pagamento consegue consultar, cancelar ou estornar.
const mockOwner = (id: string, auth?: PayAuth) => {
  const owner = mockAccounts.get(id) ?? "passe";
  if ((auth?.accessToken ?? "passe") !== owner) throw new Error(`Mercado Pago 404: pagamento ${id} não pertence a esta conta`);
};
const mock: PaymentProvider = {
  name: "mock",
  async create({ orderId, split }) {
    const id = `mock_${randomUUID()}`;
    mockAccounts.set(id, split?.accessToken ?? "passe");
    if (split) mockFees.set(id, split.applicationFeeCents);
    return { id, info: { method: "pix", pixCode: `00020126PIXSIMULADO${orderId}` } };
  },
  // Cartão simulado (testes/desenvolvimento): token "approve" aprova, "pending" fica em análise, o resto é recusado.
  async createCard({ token, split }) {
    const id = `mockcard_${randomUUID()}`;
    mockAccounts.set(id, split?.accessToken ?? "passe");
    if (split) mockFees.set(id, split.applicationFeeCents);
    if (token.startsWith("approve")) return { id, status: "approved", statusDetail: "accredited" };
    if (token.startsWith("pending")) return { id, status: "pending", statusDetail: "pending_contingency" };
    return { id, status: "rejected", statusDetail: "cc_rejected_insufficient_amount" };
  },
  async status(id, auth) {
    mockOwner(id, auth);
    return mockStatuses.get(id) ?? "pending";
  },
  async cancel(id, auth) { mockOwner(id, auth); mockStatuses.set(id, "cancelled"); },
  async refund(id, auth) { mockOwner(id, auth); mockStatuses.set(id, "refunded"); },
  // Código "ok-<n>" vira a conta simulada "seller-<n>"; qualquer outro código é recusado.
  async oauthToken(body) {
    const n = body.grant_type === "authorization_code" ? /^ok-(\w+)$/.exec(body.code)?.[1] : /^refresh-(\w+)$/.exec(body.refresh_token)?.[1];
    if (!n) throw new Error("Mercado Pago 400: invalid_grant");
    return { access_token: `seller-${n}`, refresh_token: `refresh-${n}`, user_id: `mp-${n}`, public_key: `pk-${n}`, expires_in: 15552000, live_mode: true };
  },
};

/** Só para testes: muda o status de um pagamento simulado. */
export const mockStatuses = new Map<string, PaymentStatus>();
/** Só para testes: conta (token) onde cada pagamento simulado foi criado, e a taxa do BooTickets (split). */
export const mockAccounts = new Map<string, string>();
export const mockFees = new Map<string, number>();

// ---- Mercado Pago (Pix) — https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post
const MP = "https://api.mercadopago.com";

async function mpFetch<T>(path: string, init: RequestInit = {}, auth?: PayAuth): Promise<T> {
  const res = await fetch(`${MP}${path}`, {
    ...init,
    // Pagamento de organizador conectado: usa o token dele (o dinheiro cai na conta dele).
    headers: { Authorization: `Bearer ${auth?.accessToken ?? config.mpAccessToken}`, "Content-Type": "application/json", ...init.headers },
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
  async create({ orderId, amountCents, description, payerEmail, expiresAt, split }) {
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
        // Split 1:1: a taxa do BooTickets vai para a conta do BooTickets; o restante fica com o organizador.
        ...(split ? { application_fee: split.applicationFeeCents / 100 } : {}),
        // O Mercado Pago só aceita aviso em endereço público com https; sem ele, o checkout confirma pelo polling.
        ...(config.publicUrl.startsWith("https://") ? { notification_url: `${config.publicUrl}/api/v1/webhooks/mercadopago` } : {}),
      }),
    }, split);
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
        statement_descriptor: "BOOTICKETS",
        ...(i.split ? { application_fee: i.split.applicationFeeCents / 100 } : {}),
        ...(config.publicUrl.startsWith("https://") ? { notification_url: `${config.publicUrl}/api/v1/webhooks/mercadopago` } : {}),
      }),
    }, i.split);
    const status = p.status === "approved" ? "approved" : p.status === "rejected" || p.status === "cancelled" ? "rejected" : "pending";
    return { id: String(p.id), status, statusDetail: p.status_detail ?? "" };
  },
  async cancel(id, auth) {
    await mpFetch(`/v1/payments/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) }, auth);
  },
  async refund(id, auth) {
    await mpFetch(`/v1/payments/${encodeURIComponent(id)}/refunds`, { method: "POST", headers: { "X-Idempotency-Key": `refund-${id}` }, body: "{}" }, auth);
  },
  async status(id, auth) {
    const p = await mpFetch<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`, {}, auth);
    if (p.status === "approved") return "approved";
    if (p.status === "rejected") return "rejected";
    if (p.status === "cancelled") return "cancelled";
    if (p.status === "refunded" || p.status === "charged_back") return "refunded";
    return "pending";
  },
  // https://www.mercadopago.com.br/developers/pt/docs/security/oauth/creation
  async oauthToken(body) {
    const res = await fetch(`${MP}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ client_id: config.mpClientId, client_secret: config.mpClientSecret, ...body }),
    });
    const r = (await res.json().catch(() => ({}))) as Partial<OAuthTokens> & { message?: string; error?: string };
    if (!res.ok || !r.access_token) throw new Error(`Mercado Pago ${res.status}: ${r.message ?? r.error ?? "erro na autorização"}`);
    return r as OAuthTokens;
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
