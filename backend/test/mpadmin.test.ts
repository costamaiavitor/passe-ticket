// Admin acompanha quem conectou o Mercado Pago e recebe aviso por e-mail ao conectar, desconectar ou falhar.
process.env["NODE_ENV"] = "test";
process.env["PAYMENT_PROVIDER"] = "mock";
process.env["ADMIN_EMAILS"] = "adm@t.dev";

import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

const { createApp } = await import("../src/app.js");
const { run, one, now } = await import("../src/db.js");
const { hashPassword } = await import("../src/lib/crypto.js");
const { sentEmails } = await import("../src/lib/email.js");
const { mockSplitErrors } = await import("../src/payments.js");

let base = "";
const server = createApp().listen(0);
before(() => { base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`; });
after(() => server.close());

async function api<T = any>(path: string, opts: { method?: string; body?: unknown; token?: string } = {}) {
  const res = await fetch(base + path, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"), redirect: "manual",
    headers: { "Content-Type": "application/json", ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : null,
  });
  const text = await res.text();
  let body: T; try { body = (text ? JSON.parse(text) : null) as T; } catch { body = text as T; }
  return { status: res.status, body, location: res.headers.get("location") ?? "" };
}
function cpf(nine: string) {
  const d = nine.split("").map(Number);
  for (const n of [9, 10]) { let s = 0; for (let i = 0; i < n; i++) s += d[i]! * (n + 1 - i); d.push((s * 10) % 11 % 10); }
  return d.join("");
}
const PW = "senha12345";
const T: Record<string, string> = {};
const C: Record<string, string> = {};
let seq = 0;
async function user(key: string, roles = '["buyer"]') {
  C[key] = cpf(String(500400500 + seq++));
  await run("INSERT INTO users (id, name, email, cpf, password_hash, roles, created_at) VALUES (?,?,?,?,?,?,?)",
    key, `Pessoa ${key}`, `${key.toLowerCase()}@t.dev`, C[key]!, await hashPassword(PW), roles, now());
  T[key] = (await api("/auth/login", { body: { email: `${key.toLowerCase()}@t.dev`, password: PW } })).body.accessToken;
}
const future = (days = 10) => new Date(Date.now() + days * 86400_000).toISOString();
async function event(org: string, title: string, price = 10000) {
  const r = await api("/organizer/events", { token: T[org], body: {
    title, category: "festas", startsAt: future(), venue: "Galpão", city: "Fortaleza", maxTicketsPerCpf: 4,
    batches: [{ name: "Pista", price, total: 50, salesStart: new Date(Date.now() - 1000).toISOString(), salesEnd: future() }],
  } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal((await api(`/admin/events/${r.body.id}/approve`, { method: "POST", token: T["adm"] })).status, 200);
  return r.body;
}
const buy = (who: string, ev: any) =>
  api("/orders", { token: T[who], body: { eventId: ev.id, batchId: ev.batches[0].id, holders: [{ name: "Pessoa Teste", cpf: C[who] }] } });
const orderRow = (id: string) => one<{ payment_id: string; seller_id: string | null; application_fee: number; subtotal: number; fee: number; status: string }>(
  "SELECT * FROM orders WHERE id = ?", id);

/** Faz o fluxo de conexão: pede o link, "autoriza" no Mercado Pago (simulado) e volta pelo callback. */
async function connect(org: string, code = `ok-${org}`) {
  const r = await api("/organizer/mercadopago/connect", { method: "POST", token: T[org] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const url = new URL(r.body.url);
  assert.equal(url.host, "auth.mercadopago.com.br");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  const state = url.searchParams.get("state")!;
  return { state, cb: await api(`/mp/oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`) };
}

describe("Admin: contas Mercado Pago", () => {
  before(async () => {
    await user("orgA", '["buyer","organizer"]');
    await user("orgB", '["buyer","organizer"]');
    await user("adm", '["buyer","admin"]');
    await user("ana");
  });

  const mails = (subject: string) => sentEmails.filter((m) => m.to === "adm@t.dev" && m.subject.includes(subject));

  it("lista quem conectou e avisa o admin ao conectar, desconectar e quando dá erro", async () => {
    // erro na conexão (código recusado pelo Mercado Pago)
    const bad = await connect("orgB", "codigo-invalido");
    assert.match(bad.cb.location, /mp=erro/);
    assert.equal(mails("Falha ao conectar o Mercado Pago: Pessoa orgB").length, 1);

    // conexão certa
    const ok = await connect("orgA");
    assert.match(ok.cb.location, /mp=ok/);
    assert.equal(mails("Mercado Pago conectado: Pessoa orgA").length, 1);

    let list = (await api("/admin/mp-accounts", { token: T["adm"] })).body as any[];
    const a = list.find((r) => r.email === "orga@t.dev");
    const b = list.find((r) => r.email === "orgb@t.dev");
    assert.equal(a.status, "connected");
    assert.ok(a.connectedAt);
    assert.equal(b.status, "never");
    assert.ok(!list.some((r) => r.email === "ana@t.dev"), "comprador comum não aparece");
    // só admin vê
    assert.equal((await api("/admin/mp-accounts", { token: T["orgA"] })).status, 403);

    // desconectar
    await api("/organizer/mercadopago", { method: "DELETE", token: T["orgA"] });
    assert.equal(mails("Mercado Pago desconectado: Pessoa orgA").length, 1);
    list = (await api("/admin/mp-accounts", { token: T["adm"] })).body as any[];
    assert.equal(list.find((r) => r.email === "orga@t.dev").status, "disconnected");
    // desconectar de novo não manda outro aviso
    await api("/organizer/mercadopago", { method: "DELETE", token: T["orgA"] });
    assert.equal(mails("Mercado Pago desconectado: Pessoa orgA").length, 1);
  });

  it("venda de organizador conectado que o Mercado Pago recusa: cai no BooTickets, fica anotada e o admin é avisado uma vez", async () => {
    assert.match((await connect("orgB")).cb.location, /mp=ok/);
    const ev = await event("orgB", "Festa do Split Recusado");
    mockSplitErrors.set("seller-orgB", "application_fee não permitido para esta conta");
    const o1 = await buy("ana", ev);
    assert.equal(o1.status, 201, "a venda não para");
    const row = (await orderRow(o1.body.id))!;
    assert.equal(row.seller_id, null);
    const note = (await one<{ split_note: string }>("SELECT split_note FROM orders WHERE id = ?", o1.body.id))!.split_note;
    assert.match(note, /application_fee não permitido/);
    assert.equal(mails("Venda não dividida (split falhou): Pessoa orgB").length, 1);
    // segunda venda com o mesmo erro: não manda outro e-mail
    await run("UPDATE orders SET status = 'cancelled' WHERE id = ?", o1.body.id);
    await run("UPDATE tickets SET status = 'cancelled' WHERE order_id = ?", o1.body.id);
    await buy("ana", ev);
    assert.equal(mails("Venda não dividida (split falhou): Pessoa orgB").length, 1);
    // Admin mostra o problema e o motivo; o organizador também é avisado no cartão dele
    let b = ((await api("/admin/mp-accounts", { token: T["adm"] })).body as any[]).find((r) => r.email === "orgb@t.dev");
    assert.equal(b.status, "problem");
    assert.match(b.lastError, /application_fee não permitido/);
    assert.match((await api("/organizer/mercadopago", { token: T["orgB"] })).body.problem, /recusou a última venda/);
    // o Mercado Pago volta a aceitar: a próxima venda é dividida e o alerta some sozinho
    mockSplitErrors.clear();
    const ev2 = await event("orgB", "Festa do Split de Volta");
    const o3 = await buy("ana", ev2);
    assert.equal((await orderRow(o3.body.id))!.seller_id, "orgB");
    b = ((await api("/admin/mp-accounts", { token: T["adm"] })).body as any[]).find((r) => r.email === "orgb@t.dev");
    assert.equal(b.status, "connected");
    assert.equal((await api("/organizer/mercadopago", { token: T["orgB"] })).body.problem, null);
  });

  it("organizador que não conectou: a venda fica anotada como 'não conectou' e não gera alerta", async () => {
    await user("orgC", '["buyer","organizer"]');
    const ev = await event("orgC", "Festa Sem Mercado Pago");
    const o = await buy("ana", ev);
    assert.equal((await one<{ split_note: string }>("SELECT split_note FROM orders WHERE id = ?", o.body.id))!.split_note, "not_connected");
    assert.equal(mails("Venda não dividida (split falhou): Pessoa orgC").length, 0);
  });
});
