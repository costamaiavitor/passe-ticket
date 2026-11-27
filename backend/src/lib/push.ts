// Notificações no celular de quem tem o app (pagamento aprovado, "sua festa é hoje", ingresso recebido…).
// Android: Firebase Cloud Messaging (API HTTP v1). iPhone: direto pela Apple (APNs, HTTP/2).
// Sem as chaves configuradas, nada sai e nada quebra: as notificações só aparecem no log.
import { connect } from "node:http2";
import { importPKCS8, SignJWT } from "jose";
import { config } from "../config.js";
import { all, run } from "../db.js";

export interface Push { title: string; body: string; /** Página do site que abre ao tocar (ex.: "/ingressos"). */ url?: string }

/** Nos testes automáticos as notificações ficam aqui em vez de sair. */
export const sentPushes: (Push & { userId: string })[] = [];

interface ServiceAccount { project_id: string; client_email: string; private_key: string }
const fcmAccount = (): ServiceAccount | null => {
  if (!config.fcmServiceAccount) return null;
  try { return JSON.parse(config.fcmServiceAccount) as ServiceAccount; } catch { return null; }
};
const apnsReady = () => !!(config.apnsKey && config.apnsKeyId && config.apnsTeamId);

/** O app pergunta isto antes de pedir permissão de notificação (sem chave do Firebase, o Android não registra). */
export const pushStatus = () => ({ android: !!fcmAccount(), ios: apnsReady() });

/** Envia para todos os celulares da pessoa. Nunca derruba a operação principal. */
export async function sendPush(userId: string, msg: Push): Promise<void> {
  if (config.isTest) { sentPushes.push({ userId, ...msg }); return; }
  try {
    const devices = await all<{ token: string; platform: "android" | "ios" }>("SELECT token, platform FROM push_devices WHERE user_id = ?", userId);
    for (const d of devices) {
      const ok = d.platform === "android" ? await sendFcm(d.token, msg) : await sendApns(d.token, msg);
      // Token que não vale mais (app desinstalado, permissão tirada): some da lista.
      if (ok === "gone") await run("DELETE FROM push_devices WHERE token = ?", d.token);
    }
  } catch (e) {
    console.error(`Falha ao enviar notificação para ${userId}:`, e);
  }
}

// ---------------- Android (FCM) ----------------
let fcmToken: { value: string; exp: number } | null = null;

async function fcmAccessToken(sa: ServiceAccount) {
  if (fcmToken && fcmToken.exp > Date.now() + 60_000) return fcmToken.value;
  const key = await importPKCS8(sa.private_key, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email).setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt().setExpirationTime("1h").sign(key);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!r.ok) throw new Error(`Google recusou a conta do Firebase (${r.status}): ${await r.text()}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  fcmToken = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

async function sendFcm(token: string, msg: Push): Promise<"ok" | "gone" | "error"> {
  const sa = fcmAccount();
  if (!sa) { console.log(`[notificação não enviada — configure FCM_SERVICE_ACCOUNT] ${msg.title}`); return "error"; }
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await fcmAccessToken(sa)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: {
      token,
      notification: { title: msg.title, body: msg.body },
      data: { url: msg.url ?? "/ingressos" },
      android: { priority: "high", notification: { color: "#A03DFD", sound: "default" } },
    } }),
  });
  if (r.ok) return "ok";
  const text = await r.text();
  if (r.status === 404 || text.includes("UNREGISTERED")) return "gone";
  console.error(`FCM recusou a notificação (${r.status}): ${text}`);
  return "error";
}

// ---------------- iPhone (APNs) ----------------
let apnsJwt: { value: string; exp: number } | null = null;

async function apnsAuth() {
  // A Apple aceita o mesmo token por até 1 hora (e recusa se trocar mais de uma vez a cada 20 min).
  if (apnsJwt && apnsJwt.exp > Date.now()) return apnsJwt.value;
  const key = await importPKCS8(config.apnsKey, "ES256");
  const value = await new SignJWT({}).setProtectedHeader({ alg: "ES256", kid: config.apnsKeyId })
    .setIssuer(config.apnsTeamId).setIssuedAt().sign(key);
  apnsJwt = { value, exp: Date.now() + 40 * 60_000 };
  return value;
}

async function sendApns(token: string, msg: Push): Promise<"ok" | "gone" | "error"> {
  if (!apnsReady()) { console.log(`[notificação não enviada — configure APNS_KEY] ${msg.title}`); return "error"; }
  const host = config.apnsProduction ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";
  const auth = await apnsAuth();
  const body = JSON.stringify({ aps: { alert: { title: msg.title, body: msg.body }, sound: "default" }, url: msg.url ?? "/ingressos" });
  return new Promise((resolve) => {
    const client = connect(host);
    client.on("error", (e) => { console.error("APNs:", e); resolve("error"); });
    const req = client.request({
      ":method": "POST", ":path": `/3/device/${token}`,
      authorization: `bearer ${auth}`, "apns-topic": config.apnsBundleId, "apns-push-type": "alert", "apns-priority": "10",
      "content-type": "application/json",
    });
    let status = 0, data = "";
    req.on("response", (h) => { status = Number(h[":status"]); });
    req.on("data", (c) => { data += c; });
    req.on("end", () => {
      client.close();
      if (status === 200) return resolve("ok");
      if (status === 410 || data.includes("BadDeviceToken") || data.includes("Unregistered")) return resolve("gone");
      console.error(`APNs recusou a notificação (${status}): ${data}`);
      resolve("error");
    });
    req.on("error", (e) => { client.close(); console.error("APNs:", e); resolve("error"); });
    req.end(body);
  });
}
