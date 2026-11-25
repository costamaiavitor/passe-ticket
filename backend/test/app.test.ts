// Notificações do app e "Adicionar à Carteira".
process.env["NODE_ENV"] = "test";
process.env["PAYMENT_PROVIDER"] = "mock";
process.env["CRON_SECRET"] = "segredo-do-cron-de-teste";
import { generateKeyPairSync } from "node:crypto";
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
process.env["GOOGLE_WALLET_ISSUER_ID"] = "3388000000099999999";
process.env["GOOGLE_WALLET_SERVICE_ACCOUNT"] = JSON.stringify({
  client_email: "wallet@teste.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
});

import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

const { createApp } = await import("../src/app.js");
const { run, one, now } = await import("../src/db.js");
const { hashPassword } = await import("../src/lib/crypto.js");
const { sentPushes } = await import("../src/lib/push.js");
const { sendEventReminders } = await import("../src/domain/notifications.js");

let base = "";
const server = createApp().listen(0);
before(() => { base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`; });
after(() => server.close());

async function api<T = any>(path: string, opts: { method?: string; body?: unknown; token?: string } = {}) {
  const res = await fetch(base + path, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(path === "/orders" && opts.body && typeof opts.body === "object" && !("acceptTerms" in opts.body) ? { acceptTerms: true, ...opts.body } : opts.body) : null,
  });
  const text = await res.text();
  return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
}

/** Gera um CPF válido a partir de 9 dígitos. */
function cpf(nine: string) {
  const d = nine.split("").map(Number);
  for (const n of [9, 10]) { let s = 0; for (let i = 0; i < n; i++) s += d[i]! * (n + 1 - i); d.push((s * 10) % 11 % 10); }
  return d.join("");
}
const PW = "senha12345";
const T: Record<string, string> = {};
const C: Record<string, string> = { org: cpf("400200300"), adm: cpf("400200301"), ana: cpf("400200302"), bia: cpf("400200303") };

async function user(key: string, roles = '["buyer"]') {
  await run("INSERT INTO users (id, name, email, cpf, password_hash, roles, created_at) VALUES (?,?,?,?,?,?,?)",
    key, `Pessoa ${key}`, `${key}@t.dev`, C[key]!, await hashPassword(PW), roles, now());
  T[key] = (await api("/auth/login", { body: { email: `${key}@t.dev`, password: PW } })).body.accessToken;
}

const future = (days = 10) => new Date(Date.now() + days * 86400_000).toISOString();
const lot = () => ({
  name: "Pista — 1º lote", ticketType: "Pista", price: 10000, total: 10, salesStart: new Date(Date.now() - 1000).toISOString(), salesEnd: future(),
});
async function event(title: string, startsAt = future()) {
  const r = await api("/organizer/events", { token: T["org"], body: {
    title, category: "festas", startsAt, venue: "Galpão", city: "Fortaleza", maxTicketsPerCpf: 4, batches: [lot()],
  } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal((await api(`/admin/events/${r.body.id}/approve`, { method: "POST", token: T["adm"] })).status, 200);
  return r.body;
}
async function buyPaid(key: string, ev: any) {
  const o = await api("/orders", { token: T[key], body: { eventId: ev.id, batchId: ev.batches[0].id, holders: [{ name: "Pessoa Teste", cpf: C[key]! }] } });
  assert.equal(o.status, 201, JSON.stringify(o.body));
  assert.equal((await api(`/orders/${o.body.id}/simulate-payment`, { method: "POST", token: T[key] })).status, 200);
  return o.body.id as string;
}

const pushesFor = (id: string) => sentPushes.filter((p) => p.userId === id);

describe("App: notificações e Carteira", () => {
  before(async () => {
    await user("org", '["buyer","organizer"]');
    await user("adm", '["buyer","admin"]');
    await user("ana");
    await user("bia");
  });

  it("status mostra o que está ligado", async () => {
    const r = await api("/app/status");
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.push, { android: false, ios: false });
    assert.deepEqual(r.body.wallet, { apple: false, google: true });
  });

  it("cadastra o celular; precisa de login; outro login assume o mesmo aparelho", async () => {
    assert.equal((await api("/app/devices", { body: { token: "token-do-celular-1", platform: "android" } })).status, 401);
    assert.equal((await api("/app/devices", { token: T["ana"], body: { token: "token-do-celular-1", platform: "windows" } })).status, 400);
    assert.equal((await api("/app/devices", { token: T["ana"], body: { token: "token-do-celular-1", platform: "android" } })).status, 204);
    assert.equal((await api("/app/devices", { token: T["bia"], body: { token: "token-do-celular-1", platform: "android" } })).status, 204);
    assert.equal((await one<any>("SELECT user_id FROM push_devices WHERE token = 'token-do-celular-1'"))!.user_id, "bia");
    assert.equal((await api("/app/devices/remove", { token: T["bia"], body: { token: "token-do-celular-1" } })).status, 204);
    assert.ok(!(await one("SELECT 1 FROM push_devices WHERE token = 'token-do-celular-1'")));
  });

  it("compra aprovada manda notificação para quem comprou", async () => {
    const ev = await event("Festa da Notificação");
    await buyPaid("ana", ev);
    const p = pushesFor("ana");
    assert.ok(p.some((x) => x.title.startsWith("Pagamento aprovado") && x.body.includes("Festa da Notificação")), JSON.stringify(p));
  });

  it("transferência avisa quem vai receber", async () => {
    const t = (await api("/tickets", { token: T["ana"] })).body[0];
    assert.equal((await api(`/tickets/${t.id}/transfer`, { token: T["ana"], body: { cpf: C["bia"] } })).status, 201);
    assert.ok(pushesFor("bia").some((x) => x.title === "Você recebeu um ingresso"));
    assert.equal((await api(`/tickets/${t.id}/transfer`, { method: "DELETE", token: T["ana"] })).status, 204);
  });

  it("lembrete do dia da festa sai uma vez só por evento", async () => {
    const soon = new Date(Date.now() + 5 * 3600_000).toISOString();
    const ev = await event("Festa de Hoje", soon);
    await buyPaid("bia", ev);
    const before = pushesFor("bia").length;
    const r1 = await sendEventReminders();
    const r2 = await sendEventReminders();
    assert.ok(r1.people >= 1);
    assert.equal(r2.people, 0, "segunda execução não repete");
    const got = pushesFor("bia").slice(before).filter((x) => x.body.includes("Seu ingresso está no app"));
    assert.equal(got.length, 1);
    assert.ok(got[0]!.title.includes("Festa de Hoje"));
  });

  it("rota do lembrete exige o segredo do cron", async () => {
    assert.equal((await api("/app/cron/lembretes")).status, 401);
    const res = await fetch(`${base}/app/cron/lembretes`, { headers: { Authorization: "Bearer segredo-do-cron-de-teste" } });
    assert.equal(res.status, 200);
  });

  it("Google Wallet: link com o QR do ingresso; só o dono consegue", async () => {
    const t = (await api("/tickets", { token: T["ana"] })).body[0];
    const r = await api(`/app/tickets/${t.id}/wallet/google`, { token: T["ana"] });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ok(r.body.url.startsWith("https://pay.google.com/gp/v/save/"));
    const jwt = r.body.url.split("/").pop();
    const claims = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
    assert.equal(claims.aud, "google");
    assert.equal(claims.typ, "savetowallet");
    const obj = claims.payload.eventTicketObjects[0];
    assert.equal(obj.barcode.value, t.qrPayload);
    assert.equal(obj.ticketHolderName, "Pessoa Teste");
    assert.ok(/^[\w.-]+$/.test(obj.id));
    assert.equal((await api(`/app/tickets/${t.id}/wallet/google`, { token: T["bia"] })).status, 403);
    assert.equal((await api(`/app/tickets/${t.id}/wallet/google`)).status, 401);
  });

  it("Apple Wallet desligado sem certificado; link adulterado é recusado", async () => {
    const t = (await api("/tickets", { token: T["ana"] })).body[0];
    assert.equal((await api(`/app/tickets/${t.id}/wallet/apple`, { token: T["ana"] })).status, 404);
    const bad = await fetch(`${base}/app/wallet/apple/${t.id}.pkpass?exp=${Date.now() + 60_000}&sig=falsa`);
    assert.equal(bad.status, 403);
  });
});
