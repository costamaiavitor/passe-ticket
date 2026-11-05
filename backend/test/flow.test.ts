// Fluxo completo: cadastro → compra → pagamento → QR → portaria → QR desativado.
process.env["NODE_ENV"] = "test";
process.env["PAYMENT_PROVIDER"] = "mock";
process.env["GOOGLE_CLIENT_ID"] = "test-client.apps.googleusercontent.com";

import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

const { createApp } = await import("../src/app.js");
const { run, now } = await import("../src/db.js");
const { hashPassword } = await import("../src/lib/crypto.js");
const { google } = await import("../src/lib/google.js");

let base = "";
const server = createApp().listen(0);
before(() => { base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`; });
after(() => server.close());

async function api<T = any>(path: string, opts: { method?: string; body?: unknown; token?: string } = {}) {
  const res = await fetch(base + path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : null,
  });
  const text = await res.text();
  return { status: res.status, body: (text ? JSON.parse(text) : null) as T, headers: res.headers };
}

const CPF_A = "52998224725", CPF_B = "11144477735", CPF_C = "39053344705";

async function setup() {
  const pw = await hashPassword("senha12345");
  await run("INSERT INTO users (id, name, email, cpf, password_hash, roles, created_at) VALUES ('org','Produtor','org@t.dev',?,?,'[\"buyer\",\"organizer\"]',?)", CPF_A, pw, now());
  await run("INSERT INTO users (id, name, email, cpf, password_hash, roles, created_at) VALUES ('staff','Seguranca','staff@t.dev',?,?,'[\"buyer\"]',?)", CPF_B, pw, now());
  const login = async (email: string) => (await api("/auth/login", { body: { email, password: "senha12345" } })).body.accessToken as string;
  return { org: await login("org@t.dev"), staff: await login("staff@t.dev") };
}

describe("Passe API", () => {
  let tokens: { org: string; staff: string; buyer: string; other: string };
  let eventId = "", batchId = "", otherEventId = "";

  it("cadastra comprador e valida CPF", async () => {
    const t = await setup();
    const bad = await api("/auth/register", { body: { name: "Fulano", email: "f@t.dev", cpf: "12345678900", password: "senha12345" } });
    assert.equal(bad.status, 400);
    const ok = await api("/auth/register", { body: { name: "Fulano de Tal", email: "f@t.dev", cpf: CPF_C, password: "senha12345" } });
    assert.equal(ok.status, 201);
    assert.ok(ok.body.accessToken);
    assert.match(ok.headers.get("set-cookie") ?? "", /pt_refresh=.*HttpOnly/i);
    const other = await api("/auth/register", { body: { name: "Ciclano Silva", email: "c@t.dev", cpf: CPF_B, password: "senha12345" } });
    tokens = { ...t, buyer: ok.body.accessToken, other: other.body.accessToken };
    const me = await api("/auth/me", { token: tokens.buyer });
    assert.equal(me.body.email, "f@t.dev");
  });

  it("produtor cria evento com lote e adiciona a equipe da portaria", async () => {
    const future = new Date(Date.now() + 7 * 86400_000).toISOString();
    const body = {
      title: "Festa Teste", category: "festas", startsAt: future, venue: "Galpão", city: "Fortaleza",
      batches: [{ name: "Pista", price: 5000, total: 3, salesStart: new Date(Date.now() - 1000).toISOString(), salesEnd: future }],
    };
    const r = await api("/organizer/events", { body, token: tokens.org });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    eventId = r.body.id;
    batchId = r.body.batches[0].id;
    otherEventId = (await api("/organizer/events", { body: { ...body, title: "Outra Festa" }, token: tokens.org })).body.id;
    assert.equal((await api("/organizer/events", { body, token: tokens.buyer })).status, 403);
    assert.equal((await api(`/organizer/events/${eventId}/staff`, { body: { email: "staff@t.dev" }, token: tokens.org })).status, 201);

    const pub = await api(`/events/${r.body.slug}`);
    assert.equal(pub.body.batches[0].price, 5000);
  });

  let ticketQr = "";
  let ticketId = "";

  it("compra: reserva estoque, aplica taxa de 10% e respeita limite por CPF", async () => {
    const tooMany = await api("/orders", { token: tokens.buyer, body: { eventId, batchId, holders: [
      { name: "Fulano de Tal", cpf: CPF_C }, { name: "Fulano de Tal", cpf: CPF_C }, { name: "Fulano de Tal", cpf: CPF_C }] } });
    assert.equal(tooMany.status, 409);
    assert.equal(tooMany.body.code, "CPF_LIMIT");

    const r = await api("/orders", { token: tokens.buyer, body: { eventId, batchId, holders: [
      { name: "Fulano de Tal", cpf: CPF_C }, { name: "Beltrano Souza", cpf: CPF_A }] } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.status, "pending");
    assert.equal(r.body.subtotal, 10000);
    assert.equal(r.body.fee, 1000);
    assert.equal(r.body.total, 11000);
    assert.ok(r.body.payment.pixCode);

    // Antes de pagar não há ingresso/QR
    assert.equal((await api("/tickets", { token: tokens.buyer })).body.length, 0);
    // Outro usuário não paga pedido alheio
    assert.equal((await api(`/orders/${r.body.id}/simulate-payment`, { method: "POST", token: tokens.other })).status, 403);

    const paid = await api(`/orders/${r.body.id}/simulate-payment`, { method: "POST", token: tokens.buyer });
    assert.equal(paid.body.status, "paid");

    const tickets = await api("/tickets", { token: tokens.buyer });
    assert.equal(tickets.body.length, 2);
    const [t1, t2] = tickets.body;
    assert.notEqual(t1.qrPayload, t2.qrPayload, "cada ingresso tem QR único");
    assert.match(t1.qrPayload, /^PASSE1\./);
    ticketQr = t1.qrPayload;
    ticketId = t1.id;
  });

  it("estoque: não vende além do total", async () => {
    const r = await api("/orders", { token: tokens.other, body: { eventId, batchId, holders: [
      { name: "Ciclano Silva", cpf: CPF_B }, { name: "Ciclano Silva", cpf: CPF_B }] } });
    assert.equal(r.status, 409);
    assert.equal(r.body.code, "NOT_ENOUGH_STOCK");
  });

  it("portaria: só a equipe do evento pode escanear", async () => {
    const r = await api("/checkin/scan", { token: tokens.other, body: { eventId, code: ticketQr } });
    assert.equal(r.status, 403);
  });

  it("portaria: rejeita QR forjado e de outro evento", async () => {
    const forged = ticketQr.slice(0, -3) + "abc";
    assert.equal((await api("/checkin/scan", { token: tokens.staff, body: { eventId, code: forged } })).body.result, "invalid");
    assert.equal((await api("/checkin/scan", { token: tokens.staff, body: { eventId, code: "qualquer coisa" } })).body.result, "invalid");
    assert.equal((await api("/checkin/scan", { token: tokens.org, body: { eventId: otherEventId, code: ticketQr } })).body.result, "wrong_event");
  });

  it("portaria: libera a entrada uma única vez e desativa o QR", async () => {
    const [a, b] = await Promise.all([
      api("/checkin/scan", { token: tokens.staff, body: { eventId, code: ticketQr } }),
      api("/checkin/scan", { token: tokens.org, body: { eventId, code: ticketQr } }),
    ]);
    const results = [a.body.result, b.body.result].sort();
    assert.deepEqual(results, ["already_used", "ok"], "duas leituras simultâneas liberam só uma entrada");
    const ok = a.body.ok ? a.body : b.body;
    assert.equal(ok.ticket.holderName, "Fulano de Tal");
    assert.match(ok.ticket.holderCpf, /^\*\*\*\./);

    const again = await api("/checkin/scan", { token: tokens.staff, body: { eventId, code: ticketQr } });
    assert.equal(again.body.result, "already_used");
    assert.ok(again.body.checkedInAt);

    const t = await api(`/tickets/${ticketId}`, { token: tokens.buyer });
    assert.equal(t.body.status, "used");
    assert.equal(t.body.qrPayload, null, "QR não é mais exibido após o uso");

    const stats = await api(`/checkin/events/${eventId}/stats`, { token: tokens.staff });
    assert.equal(stats.body.checkedIn, 1);
    assert.equal(stats.body.totalTickets, 2);
  });

  it("transferência gera QR novo e invalida o antigo", async () => {
    const list = (await api("/tickets", { token: tokens.buyer })).body;
    const t = list.find((x: any) => x.status === "valid");
    const oldQr = t.qrPayload;
    const tr = await api(`/tickets/${t.id}/transfer`, { token: tokens.buyer, body: { email: "c@t.dev", holderName: "Ciclano Silva", holderCpf: CPF_B } });
    assert.equal(tr.status, 200, JSON.stringify(tr.body));
    assert.equal((await api(`/tickets/${t.id}`, { token: tokens.buyer })).status, 403);
    const mine = (await api(`/tickets/${t.id}`, { token: tokens.other })).body;
    assert.notEqual(mine.qrPayload, oldQr);
    assert.equal((await api("/checkin/scan", { token: tokens.staff, body: { eventId, code: oldQr } })).body.result, "revoked");
    assert.equal((await api("/checkin/scan", { token: tokens.staff, body: { eventId, code: mine.qrPayload } })).body.result, "ok");
  });

  it("reserva expirada devolve o estoque", async () => {
    const r = await api("/orders", { token: tokens.other, body: { eventId, batchId, holders: [{ name: "Ciclano Silva", cpf: CPF_B }] } });
    assert.equal(r.status, 201, JSON.stringify(r.body)); // último ingresso do lote fica reservado
    const blocked = await api("/orders", { token: tokens.buyer, body: { eventId, batchId, holders: [{ name: "Fulano de Tal", cpf: CPF_C }] } });
    assert.equal(blocked.body.code, "SOLD_OUT");
    await run("UPDATE orders SET expires_at = ? WHERE id = ?", new Date(Date.now() - 1000).toISOString(), r.body.id);
    const again = await api("/orders", { token: tokens.buyer, body: { eventId, batchId, holders: [{ name: "Fulano de Tal", cpf: CPF_C }] } });
    assert.equal(again.status, 201, JSON.stringify(again.body));
    assert.equal((await api(`/orders/${r.body.id}`, { token: tokens.other })).body.status, "expired");
  });

  it("refresh token rotaciona a sessão", async () => {
    const l = await api("/auth/login", { body: { email: "f@t.dev", password: "senha12345" } });
    const r1 = await api("/auth/refresh", { body: { refreshToken: l.body.refreshToken } });
    assert.equal(r1.status, 200);
    const reuse = await api("/auth/refresh", { body: { refreshToken: l.body.refreshToken } });
    assert.equal(reuse.status, 401);
  });

  it("entrar com Google cria a conta, reaproveita e-mail existente e recusa token inválido", async () => {
    // Troca a conferência real do Google por uma falsa: "ok:<sub>:<email>" é aceito, o resto não.
    google.verifyIdToken = async (t: string) => {
      const [tag, sub, email] = t.split(":");
      return tag === "ok" && sub && email ? { sub, email, name: "Pessoa Google" } : null;
    };
    const bad = await api("/auth/google", { body: { credential: "x".repeat(30) } });
    assert.equal(bad.status, 401);

    const novo = await api("/auth/google", { body: { credential: `ok:g-111:nova@t.dev:${"x".repeat(20)}` } });
    assert.equal(novo.status, 200, JSON.stringify(novo.body));
    assert.equal(novo.body.user.email, "nova@t.dev");
    const again = await api("/auth/google", { body: { credential: `ok:g-111:nova@t.dev:${"x".repeat(20)}` } });
    assert.equal(again.body.user.id, novo.body.user.id);

    // E-mail que já tinha conta com senha: entra na mesma conta, e a senha continua funcionando.
    const linked = await api("/auth/google", { body: { credential: `ok:g-222:f@t.dev:${"x".repeat(20)}` } });
    assert.equal(linked.status, 200);
    assert.equal((await api("/auth/login", { body: { email: "f@t.dev", password: "senha12345" } })).body.user.id, linked.body.user.id);

    // Outra conta Google tentando o mesmo e-mail é recusada.
    const other = await api("/auth/google", { body: { credential: `ok:g-999:f@t.dev:${"x".repeat(20)}` } });
    assert.equal(other.status, 409);

    // Conta criada pelo Google não entra com senha vazia.
    assert.equal((await api("/auth/login", { body: { email: "nova@t.dev", password: "" } })).status, 401);
  });

  it("lotes do mesmo tipo viram sozinhos quando o anterior esgota", async () => {
    const future = new Date(Date.now() + 10 * 86400_000).toISOString();
    const start = new Date(Date.now() - 1000).toISOString();
    const lot = (name: string, price: number) => ({ name, price, total: 1, salesStart: start, salesEnd: future, ticketType: "Pista" });
    const created = await api("/organizer/events", { token: tokens.org, body: {
      title: "Festa Lotes", category: "festas", startsAt: future, venue: "Galpão", city: "Fortaleza",
      batches: [lot("Pista — 1º lote", 1000), lot("Pista — 2º lote", 2000)],
    } });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const [l1, l2] = created.body.batches;
    assert.equal(l1.status, "active");
    assert.equal(l2.status, "upcoming");

    const early = await api("/orders", { token: tokens.buyer, body: { eventId: created.body.id, batchId: l2.id, holders: [{ name: "Fulano de Tal", cpf: CPF_C }] } });
    assert.equal(early.body.code, "BATCH_UPCOMING");

    const o = await api("/orders", { token: tokens.buyer, body: { eventId: created.body.id, batchId: l1.id, holders: [{ name: "Fulano de Tal", cpf: CPF_C }] } });
    assert.equal(o.status, 201, JSON.stringify(o.body));
    const ev = (await api(`/events/${created.body.id}`)).body;
    assert.equal(ev.batches.find((b: { id: string }) => b.id === l1.id).status, "soldout");
    assert.equal(ev.batches.find((b: { id: string }) => b.id === l2.id).status, "active");
  });
});
