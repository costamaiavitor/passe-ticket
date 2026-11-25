// "Excluir minha conta" (exigido pela App Store e pelo Google Play, e direito da LGPD).
process.env["NODE_ENV"] = "test";
process.env["PAYMENT_PROVIDER"] = "mock";

import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

const { createApp } = await import("../src/app.js");
const { run, one, now } = await import("../src/db.js");
const { hashPassword } = await import("../src/lib/crypto.js");

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
const C: Record<string, string> = { org: cpf("300200300"), adm: cpf("300200301"), ana: cpf("300200302"), bia: cpf("300200303") };

async function user(key: string, roles = '["buyer"]') {
  await run("INSERT INTO users (id, name, email, cpf, password_hash, roles, created_at) VALUES (?,?,?,?,?,?,?)",
    key, `Pessoa ${key}`, `${key}@t.dev`, C[key]!, await hashPassword(PW), roles, now());
  T[key] = (await api("/auth/login", { body: { email: `${key}@t.dev`, password: PW } })).body.accessToken;
}

const future = (days = 10) => new Date(Date.now() + days * 86400_000).toISOString();
const lot = () => ({
  name: "Pista — 1º lote", ticketType: "Pista", price: 10000, total: 10, salesStart: new Date(Date.now() - 1000).toISOString(), salesEnd: future(),
});
async function event(title: string) {
  const r = await api("/organizer/events", { token: T["org"], body: {
    title, category: "festas", startsAt: future(), venue: "Galpão", city: "Fortaleza", maxTicketsPerCpf: 4, batches: [lot()],
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
const del = (key: string, body: Record<string, unknown>) => api("/auth/me/delete", { token: T[key], body });

describe("Excluir minha conta", () => {
  before(async () => {
    await user("org", '["buyer","organizer"]');
    await user("adm", '["buyer","admin"]');
    await user("ana");
    await user("bia");
  });

  it("senha errada → 401; sem digitar EXCLUIR → 400", async () => {
    assert.equal((await del("ana", { password: "errada123", confirm: "EXCLUIR" })).status, 401);
    assert.equal((await del("ana", { confirm: "EXCLUIR" })).status, 401, "conta com senha precisa da senha");
    const r = await del("ana", { password: PW, confirm: "sim" });
    assert.equal(r.status, 400);
    assert.equal(r.body.error?.code ?? r.body.code, "CONFIRM_REQUIRED");
  });

  it("com ingresso para evento futuro → 409 ACCOUNT_HAS_PENDING", async () => {
    const ev = await event("Festa Futura");
    await buyPaid("ana", ev);
    const check = await api("/auth/me/deletion", { token: T["ana"] });
    assert.equal(check.status, 200);
    assert.equal(check.body.needsPassword, true);
    assert.ok(check.body.blockers.length >= 1);
    const r = await del("ana", { password: PW, confirm: "EXCLUIR" });
    assert.equal(r.status, 409);
    assert.equal(r.body.error?.code ?? r.body.code, "ACCOUNT_HAS_PENDING");
  });

  it("organizador com evento que ainda vai acontecer → 409", async () => {
    // (o evento criado no teste anterior é do org e ainda vai acontecer)
    const r = await del("org", { password: PW, confirm: "EXCLUIR" });
    assert.equal(r.status, 409);
    assert.equal(r.body.error?.code ?? r.body.code, "ACCOUNT_HAS_PENDING");
  });

  it("conta sem pendências → 204; dados somem, login falha e o pedido pago fica guardado", async () => {
    const ev = await event("Festa Que Já Passou");
    const orderId = await buyPaid("bia", ev);
    // o evento já aconteceu: o ingresso dela não é mais pendência
    await run("UPDATE events SET starts_at = ? WHERE id = ?", new Date(Date.now() - 86400_000).toISOString(), ev.id);
    const check = await api("/auth/me/deletion", { token: T["bia"] });
    assert.deepEqual(check.body.blockers, []);

    const r = await del("bia", { password: PW, confirm: "excluir " });
    assert.equal(r.status, 204, JSON.stringify(r.body));

    assert.equal((await api("/auth/login", { body: { email: "bia@t.dev", password: PW } })).status, 401);
    const after = await api("/auth/me/deletion", { token: T["bia"] });
    assert.ok(after.status < 500, `token antigo não pode quebrar o servidor (veio ${after.status})`);

    const u = (await one<any>("SELECT name, email, cpf, password_hash, deleted_at FROM users WHERE id = 'bia'"))!;
    assert.equal(u.name, "Conta excluída");
    assert.ok(!u.email.includes("bia@t.dev"));
    assert.equal(u.cpf, "");
    assert.equal(u.password_hash, "");
    assert.ok(u.deleted_at);
    const o = await one<any>("SELECT status FROM orders WHERE id = ?", orderId);
    assert.equal(o?.status, "paid", "o pedido pago continua como registro de pagamento");
    // excluir de novo não funciona
    assert.notEqual((await del("bia", { confirm: "EXCLUIR" })).status, 204);
  });
});
