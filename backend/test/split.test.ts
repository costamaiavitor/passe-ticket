// Split 1:1 do Mercado Pago: organizador conecta a conta e as vendas caem direto nela, com a taxa do Passe separada.
process.env["NODE_ENV"] = "test";
process.env["PAYMENT_PROVIDER"] = "mock";

import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

const { createApp } = await import("../src/app.js");
const { run, one, now } = await import("../src/db.js");
const { hashPassword } = await import("../src/lib/crypto.js");
const { mockAccounts, mockFees, mockStatuses } = await import("../src/payments.js");

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
  C[key] = cpf(String(300400500 + seq++));
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
  assert.equal(url.host, "auth.mercadopago.com");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  const state = url.searchParams.get("state")!;
  return { state, cb: await api(`/mp/oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`) };
}

describe("Split 1:1 Mercado Pago", () => {
  before(async () => {
    await user("orgA", '["buyer","organizer"]');
    await user("orgB", '["buyer","organizer"]');
    await user("orgC", '["buyer","organizer"]');
    await user("adm", '["buyer","admin"]');
    await user("ana");
    await user("bia");
  });

  it("organizador conecta a conta: token guardado criptografado e o link só vale uma vez", async () => {
    assert.equal((await api("/organizer/mercadopago/connect", { method: "POST", token: T["ana"] })).status, 403, "comprador não conecta");
    const { state, cb } = await connect("orgA");
    assert.equal(cb.status, 302);
    assert.match(cb.location, /\/organizador\?mp=ok$/);
    const info = (await api("/organizer/mercadopago", { token: T["orgA"] })).body;
    assert.equal(info.connected, true);
    assert.equal(info.mpUserId, "mp-orgA");
    const row = (await one<{ access_token: string; refresh_token: string }>("SELECT * FROM mp_accounts WHERE user_id = 'orgA'"))!;
    assert.ok(!row.access_token.includes("seller-orgA") && row.access_token.startsWith("v1."), "token não fica em texto puro");
    assert.ok(!row.refresh_token.includes("refresh-orgA"));
    // reusar o mesmo state, state inventado, código recusado ou autorização negada → erro, sem conectar ninguém
    assert.match((await api(`/mp/oauth/callback?code=ok-orgB&state=${state}`)).location, /mp=erro/);
    assert.match((await api("/mp/oauth/callback?code=ok-orgB&state=inventado")).location, /mp=erro/);
    assert.match((await connect("orgB", "codigo-ruim")).cb.location, /mp=erro/);
    assert.match((await api("/mp/oauth/callback?error=access_denied")).location, /mp=negado/);
    assert.equal((await api("/organizer/mercadopago", { token: T["orgB"] })).body.connected, false);
  });

  it("venda de organizador conectado: Pix criado na conta dele, taxa do Passe separada, sem repasse manual", async () => {
    const ev = await event("orgA", "Festa do A", 10000);
    const o = await buy("ana", ev);
    assert.equal(o.status, 201, JSON.stringify(o.body));
    const row = (await orderRow(o.body.id))!;
    assert.equal(row.seller_id, "orgA");
    assert.equal(mockAccounts.get(row.payment_id), "seller-orgA", "Pix na conta do organizador");
    assert.equal(mockFees.get(row.payment_id), 1000, "taxa de R$ 10 para o Passe");
    assert.equal(row.application_fee, 1000);
    assert.equal(o.body.total, 11000);
    // pagamento aprovado (consulta feita com o token do organizador)
    mockStatuses.set(row.payment_id, "approved");
    assert.equal((await api(`/orders/${o.body.id}`, { token: T["ana"] })).body.status, "paid");
    const stats = (await api(`/organizer/events/${ev.id}`, { token: T["orgA"] })).body.stats;
    assert.equal(stats.revenue, 10000);
    assert.equal(stats.receivedDirect, 10000);
    assert.equal(stats.toReceive, 0, "já recebeu pelo Mercado Pago");
    const pay = ((await api("/admin/payouts", { token: T["adm"] })).body as any[]).find((p) => p.eventId === ev.id);
    assert.equal(pay.balance, 0);
    assert.equal(pay.direct, 10000);
    assert.equal((await api("/admin/payouts", { token: T["adm"], body: { eventId: ev.id, amount: 100 } })).status, 400, "não repassa de novo");
  });

  it("organizador sem conta conectada continua no modelo antigo (cai no Passe, repasse manual)", async () => {
    const ev = await event("orgB", "Festa do B", 5000);
    const o = await buy("ana", ev);
    const row = (await orderRow(o.body.id))!;
    assert.equal(row.seller_id, null);
    assert.equal(mockAccounts.get(row.payment_id), "passe");
    mockStatuses.set(row.payment_id, "approved");
    await api(`/orders/${o.body.id}`, { token: T["ana"] });
    assert.equal((await api(`/organizer/events/${ev.id}`, { token: T["orgB"] })).body.stats.toReceive, 5000);
  });

  it("três organizadores vendendo ao mesmo tempo: cada pagamento vai para a conta certa", async () => {
    await connect("orgB"); await connect("orgC");
    const evs = await Promise.all([event("orgA", "Show A2"), event("orgB", "Show B2"), event("orgC", "Show C2")]);
    const orders = await Promise.all(evs.flatMap((ev) => [buy("ana", ev), buy("bia", ev)]));
    const owners = ["orgA", "orgA", "orgB", "orgB", "orgC", "orgC"];
    for (const [i, o] of orders.entries()) {
      assert.equal(o.status, 201, JSON.stringify(o.body));
      const row = (await orderRow(o.body.id))!;
      assert.equal(row.seller_id, owners[i]);
      assert.equal(mockAccounts.get(row.payment_id), `seller-${owners[i]}`);
      assert.equal(mockFees.get(row.payment_id), row.fee);
    }
  });

  it("cartão usa a mesma conta do organizador; estorno do evento cancelado sai da conta certa", async () => {
    const ev = await event("orgC", "Festa Cartão C", 8000);
    const o = await buy("bia", ev);
    const card = await api(`/orders/${o.body.id}/card`, { token: T["bia"], body: { token: "approve-1", paymentMethodId: "master", installments: 3 } });
    assert.equal(card.status, 200, JSON.stringify(card.body));
    assert.equal(card.body.status, "paid");
    const cardId = (await one<{ id: string }>("SELECT id FROM order_payments WHERE order_id = ?", o.body.id))!.id;
    assert.equal(mockAccounts.get(cardId), "seller-orgC");
    assert.equal(mockFees.get(cardId), 800);
    // o Pix que ficou aberto é cancelado na conta do organizador
    assert.equal(mockStatuses.get((await orderRow(o.body.id))!.payment_id), "cancelled");
    const r = await api(`/organizer/events/${ev.id}`, { method: "DELETE", token: T["orgC"] });
    assert.equal(r.body.refunded, 1, JSON.stringify(r.body));
    assert.equal(mockStatuses.get(cardId), "refunded");
  });

  it("desconectar: novas vendas voltam para o Passe; pedidos antigos continuam consultando a conta do organizador", async () => {
    const ev = await event("orgB", "Festa B3");
    const old = await buy("ana", ev);
    assert.equal((await api("/organizer/mercadopago", { method: "DELETE", token: T["orgB"] })).body.connected, false);
    const nova = await buy("bia", ev);
    assert.equal((await orderRow(nova.body.id))!.seller_id, null);
    assert.equal(mockAccounts.get((await orderRow(nova.body.id))!.payment_id), "passe");
    const oldRow = (await orderRow(old.body.id))!;
    mockStatuses.set(oldRow.payment_id, "approved");
    assert.equal((await api(`/orders/${old.body.id}`, { token: T["ana"] })).body.status, "paid");
  });

  it("token perto de vencer é renovado sozinho; acesso revogado não trava as vendas", async () => {
    const ev = await event("orgA", "Festa Renovação");
    await run("UPDATE mp_accounts SET expires_at = ? WHERE user_id = 'orgA'", new Date(Date.now() + 86400_000).toISOString());
    const o = await buy("ana", ev);
    assert.equal(mockAccounts.get((await orderRow(o.body.id))!.payment_id), "seller-orgA");
    const exp = (await one<{ expires_at: string }>("SELECT expires_at FROM mp_accounts WHERE user_id = 'orgA'"))!.expires_at;
    assert.ok(new Date(exp).getTime() > Date.now() + 100 * 86400_000, "renovado por mais 180 dias");
    // organizador revogou o acesso: token vencido e renovação recusada → a venda cai no Passe em vez de falhar
    const { encrypt } = await import("../src/domain/mpaccounts.js");
    await run("UPDATE mp_accounts SET expires_at = ?, refresh_token = ? WHERE user_id = 'orgA'", new Date(Date.now() - 1000).toISOString(), encrypt("revogado"));
    const o2 = await buy("bia", ev);
    assert.equal(o2.status, 201);
    assert.equal((await orderRow(o2.body.id))!.seller_id, null);
    assert.ok((await api("/organizer/mercadopago", { token: T["orgA"] })).body.problem, "aviso para reconectar");
  });
});
