// Split 1:1 do Mercado Pago: cada organizador conecta a própria conta (OAuth) e as vendas dos eventos dele
// são criadas nessa conta, com a taxa do BooTickets separada automaticamente (application_fee).
// Docs: https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { config } from "../config.js";
import { all, now, one, run } from "../db.js";
import { mpConnectionAdminEmail, sendEmail, splitFailedAdminEmail } from "../lib/email.js";
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
  // Engano comum: a pessoa autoriza num navegador onde o Mercado Pago está aberto na conta do BooTickets.
  // Aí a "conta do organizador" seria a nossa, e nenhuma venda seria dividida.
  if (String(t.user_id) === (await platformMpId())) {
    await notifyAdmins(s.user_id, "failed", "a pessoa entrou no Mercado Pago com a conta do próprio BooTickets, não com a conta dela");
    throw badRequest("MP_SAME_ACCOUNT", "Essa é a conta Mercado Pago do próprio BooTickets. Entre no Mercado Pago com a sua conta e conecte de novo.");
  }
  await saveTokens(s.user_id, t);
  await notifyAdmins(s.user_id, "connected");
  // Já confere se uma venda cai mesmo na conta: se não cair, o organizador e os admins ficam sabendo agora, não depois de vender.
  await testSplit(s.user_id).catch((e) => console.error("Teste de split depois de conectar falhou:", e));
  return s.user_id;
}

// ---------- Conferir se o split funciona de verdade ----------
let platformId: Promise<string | null> | null = null;
/** Número da conta Mercado Pago do BooTickets (a do MP_ACCESS_TOKEN). null se não deu para consultar. */
export function platformMpId() {
  platformId ??= payments.account().then((a) => a.id).catch((e) => {
    console.error("Não consegui consultar a conta Mercado Pago do BooTickets:", e);
    platformId = null;
    return null;
  });
  return platformId;
}

const TECH = " (detalhe técnico: ";
/** Erro do Mercado Pago → motivo em português simples, com o que fazer. O texto original fica no fim, para o suporte. */
export function explainSplitError(raw: string) {
  const plain =
    /13253|without key enabled|key enabled for qr/i.test(raw)
      ? "A conta Mercado Pago do organizador não tem chave Pix cadastrada, então ela não consegue receber Pix. Ele precisa criar uma chave Pix no app do Mercado Pago (Pix → Minhas chaves). Depois disso as vendas já caem na conta dele, sem conectar de novo."
    : /Mercado Pago 40[13]\b|unauthorized|invalid.?(access.?)?token/i.test(raw)
      ? "O Mercado Pago não aceitou o acesso à conta do organizador. Ele precisa desconectar e conectar de novo."
    : /invalid users|payer.*(collector|seller)|same (user|account)|operating with yourself/i.test(raw)
      ? "O comprador e o vendedor são a mesma conta Mercado Pago (a conta conectada comprando do próprio evento)."
    : /application_fee|marketplace|sponsor/i.test(raw)
      ? "O Mercado Pago recusou a taxa do BooTickets nesta venda. É preciso conferir a aplicação do BooTickets no painel do Mercado Pago."
    : /kyc|identif|unable to operate|account.*(restrict|disabled|blocked)/i.test(raw)
      ? "A conta Mercado Pago do organizador ainda não está liberada para vender (falta completar o cadastro ou a verificação de identidade no app do Mercado Pago)."
    : "O Mercado Pago recusou a venda na conta do organizador.";
  return `${plain}${TECH}${raw.slice(0, 200)})`;
}
const plainOnly = (msg: string) => msg.split(TECH)[0]!;

/**
 * Testa a conta do organizador de verdade: confere de quem é a conta e gera um Pix de R$ 1,00 com a taxa do BooTickets,
 * que é cancelado em seguida (ninguém paga nada). Se o Mercado Pago recusar, é o mesmo motivo que derrubaria uma venda.
 */
export async function testSplit(userId: string): Promise<{ ok: boolean; mpUserId: string | null; message: string }> {
  const row = await one<{ mp_user_id: string }>("SELECT mp_user_id FROM mp_accounts WHERE user_id = ? AND disconnected_at IS NULL", userId);
  if (!row) return { ok: false, mpUserId: null, message: "Esta pessoa não está com o Mercado Pago conectado." };
  const fail = async (message: string) => {
    await reportSplitFailure(userId, message, "teste da conexão");
    return { ok: false, mpUserId: row.mp_user_id, message };
  };
  const text = (e: unknown) => (e instanceof Error ? e.message : String(e));
  let auth: PayAuth | null;
  try { auth = await sellerAuth(userId); } catch (e) { return fail(`Não consegui abrir o acesso guardado da conta: ${text(e)}`); }
  if (!auth) return fail("O acesso à conta Mercado Pago do organizador venceu ou foi revogado. Ele precisa conectar de novo.");
  let realId: string;
  try { realId = (await payments.account(auth)).id; } catch (e) { return fail(explainSplitError(text(e))); }
  if (realId === (await platformMpId()))
    return fail("A conta conectada é a conta Mercado Pago do próprio BooTickets, não a do organizador. Ele precisa desconectar e conectar de novo, entrando no Mercado Pago com a conta dele.");
  try {
    const p = await payments.create({
      orderId: `teste-${randomUUID()}`, amountCents: 100, description: "BooTickets — teste de conexão (cancelado na hora)",
      payerEmail: config.adminEmails[0] ?? "teste@bootickets.com.br", expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      split: { ...auth, applicationFeeCents: 10 }, notify: false,
    });
    await payments.cancel(p.id, auth).catch((e) => console.error("Não consegui cancelar o Pix de teste", p.id, e));
  } catch (e) {
    return fail(explainSplitError(text(e)));
  }
  await reportSplitOk(userId);
  return { ok: true, mpUserId: realId, message: "Tudo certo: o Mercado Pago aceitou gerar um Pix na conta do organizador com a taxa do BooTickets separada. As próximas vendas caem direto na conta dele." };
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

const SPLIT_ERR = "Venda não dividida: ";

/** Uma venda de organizador conectado caiu na conta do BooTickets: guarda o motivo e avisa os admins (uma vez por motivo). */
export async function reportSplitFailure(userId: string, reason: string, orderTitle: string) {
  try {
    const msg = (SPLIT_ERR + reason).slice(0, 600);
    const a = await one<{ last_error: string | null }>("SELECT last_error FROM mp_accounts WHERE user_id = ?", userId);
    if (!a || a.last_error === msg) return; // já avisado sobre este mesmo erro
    await run("UPDATE mp_accounts SET last_error = ? WHERE user_id = ?", msg, userId);
    const u = await one<{ name: string; email: string }>("SELECT name, email FROM users WHERE id = ?", userId);
    if (u) for (const to of config.adminEmails) await sendEmail(splitFailedAdminEmail(to, { name: u.name, email: u.email, reason, orderTitle }));
  } catch (e) {
    console.error("Não consegui registrar a falha de split:", e);
  }
}

/** Venda dividida com sucesso: limpa um erro de split anterior (o problema passou). */
export async function reportSplitOk(userId: string) {
  await run("UPDATE mp_accounts SET last_error = NULL WHERE user_id = ? AND last_error LIKE ?", userId, SPLIT_ERR + "%").catch(() => undefined);
}

/** Para o Admin: cada organizador e a situação da conta Mercado Pago dele. */
export async function listConnections() {
  const rows = await all<{ id: string; name: string; email: string; mp_user_id: string | null; connected_at: string | null;
    disconnected_at: string | null; last_error: string | null; events: number; direct: number; platform: number; last_note: string | null }>(
    `SELECT u.id, u.name, u.email, a.mp_user_id, a.connected_at, a.disconnected_at, a.last_error,
            (SELECT COUNT(*) FROM events e WHERE e.organizer_id = u.id AND e.status <> 'cancelled')::int events,
            (SELECT COUNT(*) FROM orders o JOIN events e ON e.id = o.event_id WHERE e.organizer_id = u.id AND o.status = 'paid' AND o.kind = 'sale'
               AND o.total > 0 AND o.seller_id IS NOT NULL)::int direct,
            (SELECT COUNT(*) FROM orders o JOIN events e ON e.id = o.event_id WHERE e.organizer_id = u.id AND o.status = 'paid' AND o.kind = 'sale'
               AND o.total > 0 AND o.seller_id IS NULL AND (a.connected_at IS NULL OR o.created_at >= a.connected_at))::int platform,
            (SELECT o.split_note FROM orders o JOIN events e ON e.id = o.event_id WHERE e.organizer_id = u.id AND o.split_note IS NOT NULL
               AND o.split_note <> 'not_connected' AND o.split_note <> '' ORDER BY o.created_at DESC LIMIT 1) last_note
       FROM users u LEFT JOIN mp_accounts a ON a.user_id = u.id
      WHERE a.user_id IS NOT NULL OR u.roles LIKE '%organizer%'
      ORDER BY (a.user_id IS NOT NULL AND a.disconnected_at IS NULL) DESC, a.connected_at DESC NULLS LAST, u.name`);
  const mine = rows.some((r) => r.mp_user_id && !r.disconnected_at) ? await platformMpId() : null;
  const uses = new Map<string, number>();
  for (const r of rows) if (r.mp_user_id && !r.disconnected_at) uses.set(r.mp_user_id, (uses.get(r.mp_user_id) ?? 0) + 1);
  return rows.map((r) => ({
    id: r.id, name: r.name, email: r.email, events: Number(r.events),
    // Conta conectada errada: é a do próprio BooTickets (nenhuma venda é dividida) ou a mesma de outro organizador.
    samePlatform: !!r.mp_user_id && !r.disconnected_at && r.mp_user_id === mine,
    sharedAccount: !!r.mp_user_id && !r.disconnected_at && (uses.get(r.mp_user_id) ?? 0) > 1,
    status: !r.mp_user_id ? "never" : r.disconnected_at ? "disconnected" : r.last_error ? "problem" : "connected",
    mpUserId: r.mp_user_id, connectedAt: r.connected_at, disconnectedAt: r.disconnected_at,
    // Vendas pagas: direto na conta do organizador x pela conta do BooTickets (depois de conectar, se conectou).
    salesDirect: Number(r.direct), salesPlatform: Number(r.platform),
    lastError: r.last_error ?? r.last_note ?? null,
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
    problem: a && !a.disconnected_at && a.last_error
      ? a.last_error.startsWith(SPLIT_ERR)
        ? `As vendas ainda não estão caindo na sua conta (por enquanto você recebe por repasse do BooTickets). Motivo: ${plainOnly(a.last_error.slice(SPLIT_ERR.length))}`
        : "Não conseguimos renovar o acesso à sua conta Mercado Pago. Conecte de novo."
      : null,
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
