// Carrinho: um pedido com ingressos de lotes diferentes.
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
const C: Record<string, string> = { org: cpf("300200300"), adm: cpf("300200302"), ana: cpf("300200303"), bia: cpf("300200304"), cau: cpf("300200305") };

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


const lots = () => [
  lot({ name: "Masculino — 1º lote", ticketType: "Masculino", price: 5000, total: 3 }),
  lot({ name: "Feminino — 1º lote", ticketType: "Feminino", price: 4000, total: 3 }),
];
const batchOf = async (evId: string, name: string) =>
  ((await api(`/events/${evId}`)).body.batches as any[]).find((b) => b.name === name);

describe("Carrinho", () => {
  before(async () => {
    await user("org", '["buyer","organizer"]');
    await user("adm", '["buyer","admin"]');
    await user("ana");
  });

  it("compra lotes diferentes num pedido só, com o total certo e estoque de cada lote", async () => {
    const ev = await event("Festa do Carrinho", { batches: lots() });
    const [m, f] = ev.batches;
    const r = await api("/orders", { token: T["ana"], body: { eventId: ev.id, items: [
      { batchId: m.id, holders: [{ name: "Pessoa Um", cpf: C["ana"] }] },
      { batchId: f.id, holders: [{ name: "Pessoa Dois", cpf: C["bia"] }, { name: "Pessoa Tres", cpf: C["cau"] }] },
    ] } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.quantity, 3);
    assert.equal(r.body.subtotal, 5000 + 2 * 4000);
    assert.equal(r.body.fee, 1300);
    assert.equal(r.body.total, 14300);
    assert.deepEqual(r.body.items.map((i: any) => [i.batchName, i.quantity, i.unitPrice]),
      [["Masculino — 1º lote", 1, 5000], ["Feminino — 1º lote", 2, 4000]]);

    await api(`/orders/${r.body.id}/simulate-payment`, { method: "POST", token: T["ana"] });
    const o = (await api(`/orders/${r.body.id}`, { token: T["ana"] })).body;
    assert.equal(o.status, "paid");
    assert.equal((await batchOf(ev.id, "Masculino — 1º lote")).sold, 1);
    assert.equal((await batchOf(ev.id, "Feminino — 1º lote")).sold, 2);
    const tickets = (await api("/tickets", { token: T["ana"] })).body as any[];
    assert.equal(tickets.filter((t) => t.event.id === ev.id).length, 3);

    // painel do organizador: receita certa por lote
    const panel = (await api(`/organizer/events/${ev.id}`, { token: T["org"] })).body;
    const rev = Object.fromEntries((panel.salesByBatch as any[]).map((b: any) => [b.name, b.revenue]));
    assert.equal(rev["Masculino — 1º lote"], 5000);
    assert.equal(rev["Feminino — 1º lote"], 8000);
  });

  it("cupom vale para o carrinho todo e o desconto é dividido entre os ingressos", async () => {
    const ev = await event("Carrinho com Cupom", { batches: lots() });
    assert.equal((await api(`/organizer/events/${ev.id}/coupons`, { token: T["org"], body: { code: "DEZ", kind: "percent", value: 10 } })).status, 201);
    const [m, f] = ev.batches;
    const r = await api("/orders", { token: T["ana"], body: { eventId: ev.id, couponCode: "dez", items: [
      { batchId: m.id, holders: [{ name: "Pessoa Um", cpf: C["ana"] }] },
      { batchId: f.id, holders: [{ name: "Pessoa Dois", cpf: C["bia"] }] },
    ] } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.discount, 900);
    assert.equal(r.body.subtotal, 9000);
    assert.equal(r.body.total, 8100 + 810);
  });

  it("se um lote do carrinho não tem vaga, nada é reservado", async () => {
    const ev = await event("Carrinho Sem Vaga", { batches: lots() });
    const [m, f] = ev.batches;
    const many = (n: number) => Array.from({ length: n }, (_, i) => ({ name: "Pessoa Teste", cpf: [C["ana"], C["bia"], C["cau"], C["org"]][i]! }));
    const r = await api("/orders", { token: T["ana"], body: { eventId: ev.id, items: [
      { batchId: m.id, holders: many(1) }, { batchId: f.id, holders: many(4) },
    ] } });
    assert.equal(r.status, 409);
    assert.equal((await batchOf(ev.id, "Masculino — 1º lote")).sold, 0);
    // a reserva do lote masculino foi desfeita: dá para comprar os 3
    const ok = await api("/orders", { token: T["ana"], body: { eventId: ev.id, batchId: m.id, holders: many(3) } });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
  });

  it("cancelar o pedido devolve as vagas de todos os lotes", async () => {
    const ev = await event("Carrinho Cancelado", { batches: lots() });
    const [m, f] = ev.batches;
    const r = await api("/orders", { token: T["ana"], body: { eventId: ev.id, items: [
      { batchId: m.id, holders: [{ name: "Pessoa Um", cpf: C["ana"] }, { name: "Pessoa Dois", cpf: C["bia"] }, { name: "Pessoa Tres", cpf: C["cau"] }] },
      { batchId: f.id, holders: [{ name: "Pessoa Um", cpf: C["ana"] }, { name: "Pessoa Dois", cpf: C["bia"] }, { name: "Pessoa Tres", cpf: C["cau"] }] },
    ] } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal((await api(`/orders/${r.body.id}/cancel`, { method: "POST", token: T["ana"] })).status, 200);
    const again = await api("/orders", { token: T["ana"], body: { eventId: ev.id, items: [
      { batchId: m.id, holders: [{ name: "Pessoa Um", cpf: C["ana"] }, { name: "Pessoa Dois", cpf: C["bia"] }, { name: "Pessoa Tres", cpf: C["cau"] }] },
      { batchId: f.id, holders: [{ name: "Pessoa Um", cpf: C["ana"] }, { name: "Pessoa Dois", cpf: C["bia"] }, { name: "Pessoa Tres", cpf: C["cau"] }] },
    ] } });
    assert.equal(again.status, 201, JSON.stringify(again.body));
  });
  it("não deixa comprar dois lotes da mesma categoria, a não ser na virada de lote", async () => {
    const ev = await event("Virada no Carrinho", { batches: [
      lot({ name: "Pista — 1º lote", ticketType: "Pista", price: 5000, total: 2 }),
      lot({ name: "Pista — 2º lote", ticketType: "Pista", price: 7000, total: 5 }),
      lot({ name: "VIP", ticketType: "VIP", price: 9000, total: 5 }),
    ] });
    const [p1, p2, vip] = ev.batches;
    const h = (...ks: string[]) => ks.map((k) => ({ name: "Pessoa Teste", cpf: C[k]! }));
    // 1 do 1º lote + 1 do 2º (ainda sobra 1 no 1º): recusado
    let r = await api("/orders", { token: T["ana"], body: { eventId: ev.id, items: [{ batchId: p1.id, holders: h("ana") }, { batchId: p2.id, holders: h("bia") }] } });
    assert.equal(r.status, 409);
    assert.equal(r.body.code, "BATCH_UPCOMING");
    // só o 2º lote: recusado
    r = await api("/orders", { token: T["ana"], body: { eventId: ev.id, batchId: p2.id, holders: h("ana") } });
    assert.equal(r.status, 409);
    // virada: leva os 2 que restam do 1º lote + 1 do 2º, e ainda 1 VIP (outra categoria)
    r = await api("/orders", { token: T["ana"], body: { eventId: ev.id, items: [
      { batchId: p1.id, holders: h("ana", "bia") }, { batchId: p2.id, holders: h("cau") }, { batchId: vip.id, holders: h("org") },
    ] } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.subtotal, 2 * 5000 + 7000 + 9000);
  });

  it("lotes sem tipo: \"1º Lote\" e \"2º Lote\" são a mesma categoria; \"VIP\" é outra", async () => {
    const ev = await event("Sem Tipo", { batches: [
      lot({ name: "1º Lote", ticketType: "", price: 5000, total: 5 }),
      lot({ name: "2º Lote", ticketType: "", price: 7000, total: 5 }),
      lot({ name: "VIP", ticketType: "", price: 9000, total: 5 }),
    ] });
    const st = Object.fromEntries(((await api(`/events/${ev.id}`)).body.batches as any[]).map((b) => [b.name, b.status]));
    assert.deepEqual(st, { "1º Lote": "active", "2º Lote": "upcoming", "VIP": "active" });
  });
});

