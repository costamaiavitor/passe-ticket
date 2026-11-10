// Evento privado, palavra-senha, cupons de desconto e ingressos de cortesia.
process.env["NODE_ENV"] = "test";
process.env["PAYMENT_PROVIDER"] = "mock";

import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

const { createApp } = await import("../src/app.js");
const { run, now } = await import("../src/db.js");
const { hashPassword } = await import("../src/lib/crypto.js");
const { sentEmails } = await import("../src/lib/email.js");

let base = "";
const server = createApp().listen(0);
before(() => { base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`; });
after(() => server.close());

async function api<T = any>(path: string, opts: { method?: string; body?: unknown; token?: string } = {}) {
  const res = await fetch(base + path, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : null,
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
const C: Record<string, string> = { org: cpf("100200300"), org2: cpf("100200301"), adm: cpf("100200302"), ana: cpf("100200303"), bia: cpf("100200304") };

async function user(key: string, roles = '["buyer"]') {
  await run("INSERT INTO users (id, name, email, cpf, password_hash, roles, created_at) VALUES (?,?,?,?,?,?,?)",
    key, `Pessoa ${key}`, `${key}@t.dev`, C[key]!, await hashPassword(PW), roles, now());
  T[key] = (await api("/auth/login", { body: { email: `${key}@t.dev`, password: PW } })).body.accessToken;
}

const future = (days = 10) => new Date(Date.now() + days * 86400_000).toISOString();
const lot = (over: Record<string, unknown> = {}) => ({
  name: "Pista — 1º lote", ticketType: "Pista", price: 10000, total: 10, salesStart: new Date(Date.now() - 1000).toISOString(), salesEnd: future(), ...over,
});
async function event(title: string, extra: Record<string, unknown> = {}) {
  const r = await api("/organizer/events", { token: T["org"], body: {
    title, category: "festas", startsAt: future(), venue: "Galpão", city: "Fortaleza", maxTicketsPerCpf: 4, batches: [lot()], ...extra,
  } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal((await api(`/admin/events/${r.body.id}/approve`, { method: "POST", token: T["adm"] })).status, 200);
  return r.body;
}
const buy = (token: string, ev: any, holderCpf: string, extra: Record<string, unknown> = {}, qty = 1) =>
  api("/orders", { token, body: { eventId: ev.id, batchId: ev.batches[0].id, holders: Array.from({ length: qty }, () => ({ name: "Pessoa Teste", cpf: holderCpf })), ...extra } });

describe("Privado, senha, cupons e cortesias", () => {
  before(async () => {
    await user("org", '["buyer","organizer"]');
    await user("org2", '["buyer","organizer"]');
    await user("adm", '["buyer","admin"]');
    await user("ana");
    await user("bia");
  });

  // ---------------- Evento privado ----------------
  it("evento privado não aparece na lista nem na busca, mas abre pelo link", async () => {
    const ev = await event("Aniversário Secreto", { visibility: "unlisted" });
    assert.match(ev.slug, /^aniversario-secreto-[a-z0-9]{8}$/, "link difícil de adivinhar");
    const list = (await api("/events")).body as any[];
    assert.ok(!list.some((e) => e.id === ev.id));
    assert.ok(!((await api("/events?q=Secreto")).body as any[]).some((e) => e.id === ev.id));
    assert.equal((await api("/events/aniversario-secreto")).status, 404, "o nome puro não acha o evento");
    const page = await api(`/events/${ev.slug}`);
    assert.equal(page.status, 200);
    assert.equal(page.body.visibility, "unlisted");
    // dá para comprar normalmente com o link
    assert.equal((await buy(T["ana"]!, page.body, C["ana"]!)).status, 201);
  });

  it("evento público que vira privado ganha link novo; editar outro campo não desfaz o privado", async () => {
    const ev = await event("Festa Que Fica Privada");
    assert.ok(((await api("/events")).body as any[]).some((e) => e.id === ev.id));
    const r = await api(`/organizer/events/${ev.id}`, { method: "PATCH", token: T["org"], body: { visibility: "unlisted" } });
    assert.equal(r.status, 200);
    assert.notEqual(r.body.slug, ev.slug);
    assert.equal((await api(`/events/${ev.slug}`)).status, 404, "link antigo para de funcionar");
    // mudar só o nome não pode apagar privacidade nem senha
    await api(`/organizer/events/${ev.id}`, { method: "PATCH", token: T["org"], body: { accessCode: "segredo" } });
    const r2 = await api(`/organizer/events/${ev.id}`, { method: "PATCH", token: T["org"], body: { title: "Festa Renomeada" } });
    assert.equal(r2.body.visibility, "unlisted");
    assert.equal(r2.body.requiresAccessCode, true);
    assert.ok(!((await api("/events")).body as any[]).some((e) => e.id === ev.id));
    // volta a ser público
    await api(`/organizer/events/${ev.id}`, { method: "PATCH", token: T["org"], body: { visibility: "public" } });
    assert.ok(((await api("/events")).body as any[]).some((e) => e.id === ev.id));
  });

  // ---------------- Palavra-senha ----------------
  it("palavra-senha: sem ela ou errada não compra; certa (sem ligar p/ maiúscula e acento) compra", async () => {
    const ev = await event("Festa Fechada", { accessCode: "Lua Cheia" });
    const page = await api(`/events/${ev.id}`);
    assert.equal(page.body.requiresAccessCode, true);
    assert.ok(!JSON.stringify(page.body).includes("Lua Cheia"), "a senha nunca aparece para o público");
    assert.equal((await buy(T["ana"]!, ev, C["ana"]!)).status, 403);
    assert.equal((await buy(T["ana"]!, ev, C["ana"]!, { accessCode: "lua nova" })).status, 403);
    assert.equal((await api(`/events/${ev.id}/access-code`, { body: { code: "errada" } })).status, 403);
    assert.equal((await api(`/events/${ev.id}/access-code`, { body: { code: "  LÚA cheia " } })).status, 200);
    assert.equal((await buy(T["ana"]!, ev, C["ana"]!, { accessCode: "  LÚA cheia " })).status, 201);
    // o organizador vê a senha no painel
    assert.equal((await api(`/organizer/events/${ev.id}`, { token: T["org"] })).body.accessCode, "Lua Cheia");
    // tirar a senha libera a compra
    await api(`/organizer/events/${ev.id}`, { method: "PATCH", token: T["org"], body: { accessCode: "" } });
    assert.equal((await buy(T["bia"]!, ev, C["bia"]!)).status, 201);
  });

  // ---------------- Cupons ----------------
  it("cupom de %: desconto sai do ingresso, taxa calculada já com desconto, limite de usos respeitado", async () => {
    const ev = await event("Festa Com Cupom");
    const cp = await api(`/organizer/events/${ev.id}/coupons`, { token: T["org"], body: { code: "verao50", kind: "percent", value: 50, maxUses: 2 } });
    assert.equal(cp.status, 201);
    assert.equal(cp.body.code, "VERAO50");
    // prévia
    const prev = await api(`/events/${ev.id}/coupon`, { body: { code: " Verao50 ", quantity: 1 } });
    assert.deepEqual(prev.body, { code: "VERAO50", kind: "percent", value: 50 });
    // compra com 2 ingressos: R$ 200 → desconto R$ 100 → subtotal R$ 100 + taxa R$ 10
    const o = await buy(T["ana"]!, ev, C["ana"]!, { couponCode: "verao50" }, 2);
    assert.equal(o.status, 201, JSON.stringify(o.body));
    assert.equal(o.body.subtotal, 20000);
    assert.equal(o.body.discount, 10000);
    assert.equal(o.body.fee, 1000);
    assert.equal(o.body.total, 11000);
    assert.equal(o.body.couponCode, "VERAO50");
    // limite de 2 ingressos já usado
    assert.equal((await buy(T["bia"]!, ev, C["bia"]!, { couponCode: "VERAO50" })).status, 409);
    // pedido pago: organizador recebe o valor com desconto
    await api(`/orders/${o.body.id}/simulate-payment`, { method: "POST", token: T["ana"] });
    const panel = (await api(`/organizer/events/${ev.id}`, { token: T["org"] })).body;
    assert.equal(panel.stats.revenue, 10000);
    const coupons = (await api(`/organizer/events/${ev.id}/coupons`, { token: T["org"] })).body;
    assert.equal(coupons[0].uses, 2);
  });

  it("cupom de valor fixo, cupom inválido, pausado e excluído", async () => {
    const ev = await event("Festa Cupom Fixo");
    const cp = (await api(`/organizer/events/${ev.id}/coupons`, { token: T["org"], body: { code: "MENOS30", kind: "fixed", value: 3000 } })).body;
    const o = await buy(T["ana"]!, ev, C["ana"]!, { couponCode: "menos30" });
    assert.equal(o.body.discount, 3000);
    assert.equal(o.body.total, 7000 + 700);
    // cupom maior que o ingresso não deixa negativo
    await api(`/organizer/events/${ev.id}/coupons`, { token: T["org"], body: { code: "TUDO", kind: "fixed", value: 999999 } });
    const free = await buy(T["bia"]!, ev, C["bia"]!, { couponCode: "tudo" });
    assert.equal(free.body.total, 0);
    assert.equal(free.body.status, "paid", "ficou de graça: ingresso sai na hora");
    // inválido
    assert.equal((await buy(T["bia"]!, ev, C["bia"]!, { couponCode: "NAOEXISTE" })).status, 400);
    assert.equal((await api(`/events/${ev.id}/coupon`, { body: { code: "NAOEXISTE" } })).status, 400);
    // pausado
    await api(`/organizer/coupons/${cp.id}`, { method: "PATCH", token: T["org"], body: { active: false } });
    assert.equal((await buy(T["bia"]!, ev, C["bia"]!, { couponCode: "MENOS30" })).status, 400);
    // usado → excluir só desativa; não usado → exclui
    assert.equal((await api(`/organizer/coupons/${cp.id}`, { method: "DELETE", token: T["org"] })).body.deleted, false);
    const novo = (await api(`/organizer/events/${ev.id}/coupons`, { token: T["org"], body: { code: "NOVO", kind: "percent", value: 10 } })).body;
    assert.equal((await api(`/organizer/coupons/${novo.id}`, { method: "DELETE", token: T["org"] })).body.deleted, true);
    // código repetido e % acima de 100
    assert.equal((await api(`/organizer/events/${ev.id}/coupons`, { token: T["org"], body: { code: "menos30", kind: "percent", value: 5 } })).status, 409);
    assert.equal((await api(`/organizer/events/${ev.id}/coupons`, { token: T["org"], body: { code: "MUITO", kind: "percent", value: 150 } })).status, 400);
    // outro organizador não vê nem mexe
    assert.equal((await api(`/organizer/events/${ev.id}/coupons`, { token: T["org2"] })).status, 403);
    assert.equal((await api(`/organizer/coupons/${cp.id}`, { method: "PATCH", token: T["org2"], body: { active: true } })).status, 403);
    // cupom de um evento não vale em outro
    const outro = await event("Outra Festa");
    assert.equal((await buy(T["bia"]!, outro, C["bia"]!, { couponCode: "MENOS30" })).status, 400);
  });

  // ---------------- Cortesias ----------------
  it("cortesia para quem já tem conta: o ingresso vai direto para a conta da pessoa", async () => {
    const ev = await event("Festa Cortesia");
    const r = await api(`/organizer/events/${ev.id}/courtesies`, { token: T["org"], body: { batchId: ev.batches[0].id, name: "Ana Convidada", cpf: C["ana"] } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.state, "delivered");
    const t = ((await api("/tickets", { token: T["ana"] })).body as any[]).find((x) => x.event.id === ev.id);
    assert.ok(t && t.status === "valid" && t.qrPayload);
    assert.ok(sentEmails.some((m) => m.to === "ana@t.dev" && m.subject.includes("cortesia")));
    const panel = (await api(`/organizer/events/${ev.id}`, { token: T["org"] })).body;
    assert.equal(panel.stats.courtesies, 1);
    assert.equal(panel.stats.revenue, 0);
    assert.equal(panel.stats.buyers, 0, "cortesia não conta como comprador");
    const att = ((await api(`/organizer/events/${ev.id}/tickets`, { token: T["org"] })).body as any[])[0];
    assert.equal(att.courtesy, true);
    // o organizador não vê esse pedido nos pedidos dele
    assert.ok(!((await api("/orders", { token: T["org"] })).body as any[]).some((o) => o.eventId === ev.id));
  });

  it("cortesia para CPF sem conta: a pessoa cria a conta com o CPF e aceita", async () => {
    const ev = await event("Festa Cortesia Nova");
    const novoCpf = cpf("555666777");
    const r = await api(`/organizer/events/${ev.id}/courtesies`, { token: T["org"], body: { batchId: ev.batches[0].id, name: "Caio Novo", cpf: novoCpf, email: "caio.novo@t.dev" } });
    assert.equal(r.body.state, "waiting");
    assert.ok(sentEmails.some((m) => m.to === "caio.novo@t.dev"));
    // não aparece como ingresso do organizador
    assert.ok(!((await api("/tickets", { token: T["org"] })).body as any[]).some((x) => x.event.id === ev.id));
    const reg = await api("/auth/register", { body: { name: "Caio Novo", email: "caio.novo@t.dev", cpf: novoCpf, password: PW } });
    const tok = reg.body.accessToken;
    const inc = (await api("/tickets/transfers/incoming", { token: tok })).body;
    assert.equal(inc.transfers.length, 1);
    assert.equal((await api(`/tickets/transfers/${inc.transfers[0].id}/accept`, { method: "POST", token: tok })).status, 200);
    assert.ok(((await api("/tickets", { token: tok })).body as any[]).some((x) => x.event.id === ev.id && x.status === "valid"));
    assert.equal(((await api(`/organizer/events/${ev.id}/courtesies`, { token: T["org"] })).body as any[])[0].state, "delivered");
  });

  it("cortesia ocupa vaga, respeita limite por CPF, pode ser cancelada e só o dono do evento dá", async () => {
    const ev = await event("Festa Lotada", { batches: [lot({ total: 1 })], maxTicketsPerCpf: 1 });
    const give = (body: Record<string, unknown>, token = T["org"]) => api(`/organizer/events/${ev.id}/courtesies`, { token, body: { batchId: ev.batches[0].id, ...body } });
    assert.equal((await give({ name: "Bia Lima", cpf: C["bia"] }, T["org2"])).status, 403);
    assert.equal((await give({ name: "Bia", cpf: "123" })).status, 400);
    const c1 = await give({ name: "Bia Lima", cpf: C["bia"] });
    assert.equal(c1.status, 201);
    assert.equal((await give({ name: "Ana Souza", cpf: C["ana"] })).status, 409, "lote cheio");
    assert.equal((await buy(T["ana"]!, ev, C["ana"]!)).status, 409, "cortesia ocupou a vaga da venda");
    // cancela: libera a vaga e o QR deixa de valer
    const qr = ((await api("/tickets", { token: T["bia"] })).body as any[]).find((x) => x.event.id === ev.id).qrPayload;
    assert.equal((await api(`/organizer/courtesies/${c1.body.id}`, { method: "DELETE", token: T["org2"] })).status, 403);
    assert.equal((await api(`/organizer/courtesies/${c1.body.id}`, { method: "DELETE", token: T["org"] })).status, 200);
    assert.equal((await api("/checkin/scan", { token: T["org"], body: { eventId: ev.id, code: qr } })).body.ok, false);
    assert.equal((await buy(T["ana"]!, ev, C["ana"]!)).status, 201, "vaga liberada");
  });

  it("criar evento já com privado, senha, cupons e cortesias", async () => {
    const r = await api("/organizer/events", { token: T["org"], body: {
      title: "Festa Completa", category: "festas", startsAt: future(), venue: "Galpão", city: "Fortaleza",
      visibility: "unlisted", accessCode: "vip2026",
      batches: [lot(), lot({ name: "Camarote — 1º lote", ticketType: "Camarote", price: 30000 })],
      coupons: [{ code: "AMIGOS", kind: "percent", value: 20 }],
      courtesies: [{ name: "Ana Convidada", cpf: C["ana"], batchIndex: 1 }, { name: "Ana Segunda", cpf: C["ana"], batchIndex: 0 }],
    } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.visibility, "unlisted");
    assert.equal(r.body.requiresAccessCode, true);
    assert.equal(r.body.courtesyErrors.length, 0);
    const coupons = (await api(`/organizer/events/${r.body.id}/coupons`, { token: T["org"] })).body;
    assert.equal(coupons[0].code, "AMIGOS");
    const cs = (await api(`/organizer/events/${r.body.id}/courtesies`, { token: T["org"] })).body as any[];
    assert.equal(cs.length, 2);
    assert.ok(cs.some((c) => c.batchName.startsWith("Camarote")));
    // CPF inválido na criação é recusado antes de criar o evento
    const bad = await api("/organizer/events", { token: T["org"], body: {
      title: "Festa Erro", category: "festas", startsAt: future(), venue: "G", city: "F", batches: [lot()],
      courtesies: [{ name: "Fulano", cpf: "111", batchIndex: 0 }],
    } });
    assert.equal(bad.status, 400);
  });
});
