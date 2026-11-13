// Split 1:1 do Mercado Pago: cada organizador conecta a própria conta (OAuth) e as vendas dos eventos dele
// são criadas nessa conta, com a taxa do BooTickets separada automaticamente (application_fee).
// Docs: https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { config } from "../config.js";
import { all, now, one, run } from "../db.js";
import { mpConnectionAdminEmail, sendEmail } from "../lib/email.js";
import { badRequest, HttpError } from "../lib/errors.js";
import { payments, type OAuthTokens, type PayAuth } from "../payments.js";

// ---------- Tokens criptografados no banco (AES-256-GCM) ----------
const key = createHash("sha256").update(`mp-tokens:${config.tokenKey}`).digest();
export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${data.toString("base64url")}`;
}
export function decrypt(enc: string) {
  const [v, iv, tag, data] = enc.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Token em formato desconhecido");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}

interface AccountRow {
  user_id: string; mp_user_id: string; access_token: string; refresh_token: string; public_key: string;
  live_mode: number; expires_at: string; connected_at: string; disconnected_at: string | null; last_error: string | null;
}

/** O split só funciona com o "Client ID" e o "Client Secret" da aplicação Mercado Pago configurados. */
export const splitAvailable = () => config.paymentProvider === "mock" || (!!config.mpClientId && !!config.mpClientSecret);
export const redirectUri = () => `${config.publicUrl}/api/v1/mp/oauth/callback`;

// ---------- Conectar ----------
/** Começa a conexão: devolve o link de autorização do Mercado Pago (com state e PKCE, válidos por 10 min). */
export async function startConnect(userId: string) {
  if (!splitAvailable()) throw new HttpError(503, "SPLIT_DISABLED", "A conexão com o Mercado Pago ainda não está ativada no BooTickets.");
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  await run("DELETE FROM mp_oauth_states WHERE expires_at < ?", now());
  await run("INSERT INTO mp_oauth_states (state, user_id, verifier, expires_at) VALUES (?,?,?,?)",
    state, userId, verifier, new Date(Date.now() + 10 * 60_000).toISOString());
  const q = new URLSearchParams({
    client_id: config.mpClientId || "mock", response_type: "code", platform_id: "mp", state,
    redirect_uri: redirectUri(), code_challenge: challenge, code_challenge_method: "S256",
  });
  return `https://auth.mercadopago.com.br/authorization?${q}`;
}

/** Volta do Mercado Pago: confere o state, troca o código pelos tokens e guarda a conta do organizador. */
export async function finishConnect(state: string, code: string) {
  const s = await one<{ user_id: string; verifier: string; expires_at: string }>("SELECT * FROM mp_oauth_states WHERE state = ?", state);
  // O state só vale uma vez.
  await run("DELETE FROM mp_oauth_states WHERE state = ?", state);
  if (!s || s.expires_at < now()) throw badRequest("OAUTH_STATE", "O link de conexão expirou. Tente conectar de novo.");
  let t: OAuthTokens;
  try {
    t = await payments.oauthToken({ grant_type: "authorization_code", code, redirect_uri: redirectUri(), code_verifier: s.verifier });
  } catch (e) {
    await notifyAdmins(s.user_id, "failed", e instanceof Error ? e.message : String(e));
    throw e;
  }
  await saveTokens(s.user_id, t);
  await notifyAdmins(s.user_id, "connected");
  return s.user_id;
}

/** Avisa os admins (ADMIN_EMAILS) por e-mail. Falha no e-mail nunca atrapalha a conexão. */
async function notifyAdmins(userId: string, kind: "connected" | "disconnected" | "failed", detail?: string) {
  try {
    const u = await one<{ name: string; email: string }>("SELECT name, email FROM users WHERE id = ?", userId);
    if (!u) return;
    for (const to of config.adminEmails) await sendEmail(mpConnectionAdminEmail(to, { name: u.name, email: u.email, kind, ...(detail ? { detail } : {}) }));
  } catch (e) {
    console.error("Não consegui avisar os admins sobre o Mercado Pago:", e);
  }
}

async function saveTokens(userId: string, t: OAuthTokens) {
  const expires = new Date(Date.now() + (t.expires_in || 15_552_000) * 1000).toISOString();
  await run(
    `INSERT INTO mp_accounts (user_id, mp_user_id, access_token, refresh_token, public_key, live_mode, expires_at, connected_at, disconnected_at, last_error)
     VALUES (?,?,?,?,?,?,?,?,NULL,NULL)
     ON CONFLICT (user_id) DO UPDATE SET mp_user_id = EXCLUDED.mp_user_id, access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token, public_key = EXCLUDED.public_key, live_mode = EXCLUDED.live_mode,
       expires_at = EXCLUDED.expires_at, connected_at = EXCLUDED.connected_at, disconnected_at = NULL, last_error = NULL`,
    userId, String(t.user_id), encrypt(t.access_token), encrypt(t.refresh_token), t.public_key ?? "", t.live_mode === false ? 0 : 1, expires, now(),
  );
}

/** Desconecta: as próximas vendas voltam a cair na conta do BooTickets (com repasse manual). As antigas continuam
 *  usando a conta do organizador para estornos — por isso o token não é apagado. */
export async function disconnect(userId: string) {
  const was = await one("SELECT 1 FROM mp_accounts WHERE user_id = ? AND disconnected_at IS NULL", userId);
  await run("UPDATE mp_accounts SET disconnected_at = ? WHERE user_id = ? AND disconnected_at IS NULL", now(), userId);
  if (was) await notifyAdmins(userId, "disconnected");
}

/** Para o Admin: cada organizador e a situação da conta Mercado Pago dele. */
export async function listConnections() {
  const rows = await all<{ id: string; name: string; email: string; mp_user_id: string | null; connected_at: string | null;
    disconnected_at: string | null; last_error: string | null; events: number }>(
    `SELECT u.id, u.name, u.email, a.mp_user_id, a.connected_at, a.disconnected_at, a.last_error,
            (SELECT COUNT(*) FROM events e WHERE e.organizer_id = u.id AND e.status <> 'cancelled')::int events
       FROM users u LEFT JOIN mp_accounts a ON a.user_id = u.id
      WHERE a.user_id IS NOT NULL OR u.roles LIKE '%organizer%'
      ORDER BY (a.user_id IS NOT NULL AND a.disconnected_at IS NULL) DESC, a.connected_at DESC NULLS LAST, u.name`);
  return rows.map((r) => ({
    id: r.id, name: r.name, email: r.email, events: Number(r.events),
    status: !r.mp_user_id ? "never" : r.disconnected_at ? "disconnected" : r.last_error ? "problem" : "connected",
    mpUserId: r.mp_user_id, connectedAt: r.connected_at, disconnectedAt: r.disconnected_at,
  }));
}

export async function connectionInfo(userId: string) {
  const a = await one<AccountRow>("SELECT * FROM mp_accounts WHERE user_id = ?", userId);
  return {
    available: splitAvailable(),
    connected: !!a && !a.disconnected_at,
    mpUserId: a && !a.disconnected_at ? a.mp_user_id : null,
    connectedAt: a && !a.disconnected_at ? a.connected_at : null,
    // Ex.: o organizador revogou o acesso pelo app do Mercado Pago e a renovação falhou.
    problem: a && !a.disconnected_at && a.last_error ? "Não conseguimos renovar o acesso à sua conta Mercado Pago. Conecte de novo." : null,
  };
}

// ---------- Usar a conta ----------
const RENEW_BEFORE_MS = 15 * 86400_000; // renova quando faltam menos de 15 dias para vencer (o token vale 180 dias)

/** Token da conta do organizador (renovado se estiver perto de vencer). null = sem conta utilizável. */
export async function sellerAuth(userId: string, opts: { includeDisconnected?: boolean } = {}): Promise<PayAuth | null> {
  const a = await one<AccountRow>("SELECT * FROM mp_accounts WHERE user_id = ?", userId);
  if (!a || (a.disconnected_at && !opts.includeDisconnected)) return null;
  if (new Date(a.expires_at).getTime() - Date.now() > RENEW_BEFORE_MS) return { accessToken: decrypt(a.access_token) };
  try {
    const t = await payments.oauthToken({ grant_type: "refresh_token", refresh_token: decrypt(a.refresh_token) });
    await saveTokens(userId, t);
    if (a.disconnected_at) await run("UPDATE mp_accounts SET disconnected_at = ? WHERE user_id = ?", a.disconnected_at, userId);
    return { accessToken: t.access_token };
  } catch (e) {
    console.error(`Falha ao renovar o token Mercado Pago do organizador ${userId}:`, e);
    await run("UPDATE mp_accounts SET last_error = ? WHERE user_id = ?", e instanceof Error ? e.message.slice(0, 300) : "erro", userId);
    // Ainda dentro da validade: segue com o token atual.
    return new Date(a.expires_at).getTime() > Date.now() ? { accessToken: decrypt(a.access_token) } : null;
  }
}

/** Conta onde os pagamentos de um pedido existem: a do organizador (split) ou a do BooTickets (undefined). */
export async function authForOrder(o: { seller_id?: string | null }): Promise<PayAuth | undefined> {
  if (!o.seller_id) return undefined;
  const auth = await sellerAuth(o.seller_id, { includeDisconnected: true });
  if (!auth) throw new HttpError(502, "SELLER_ACCOUNT_UNAVAILABLE",
    "Não conseguimos acessar a conta Mercado Pago do organizador. Peça para ele conectar a conta de novo.");
  return auth;
}
