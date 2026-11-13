// Co-organizadores: o dono convida outras contas para organizar o evento junto.
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
const C: Record<string, string> = { org: cpf("400200300"), adm: cpf("400200302"), ana: cpf("400200303"), bia: cpf("400200304"), cau: cpf("400200305") };

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



describe("Co-organizadores", () => {
  before(async () => {
    await user("org", '["buyer","organizer"]');
    await user("adm", '["buyer","admin"]');
    await user("ana");
    await user("bia");
  });

  it("dono convida por e-mail; o convidado vê, edita e opera o evento, mas não remove nem convida", async () => {
    const ev = await event("Festa a Quatro Mãos");
    // comprador comum não acessa
    assert.equal((await api(`/organizer/events/${ev.id}`, { token: T["ana"] })).status, 403);
    // e-mail sem conta
    assert.equal((await api(`/organizer/events/${ev.id}/organizers`, { token: T["org"], body: { email: "ninguem@t.dev" } })).status, 404);
    // convite
    const inv = await api(`/organizer/events/${ev.id}/organizers`, { token: T["org"], body: { email: "ANA@t.dev" } });
    assert.equal(inv.status, 201, JSON.stringify(inv.body));
    assert.ok(sentEmails.some((m) => m.to === "ana@t.dev" && m.subject.includes("Festa a Quatro Mãos")));
    // Ana entra de novo (agora com a função de organizador) e vê o evento em Meus eventos
    T["ana"] = (await api("/auth/login", { body: { email: "ana@t.dev", password: PW } })).body.accessToken;
    const mine = (await api("/organizer/events", { token: T["ana"] })).body as any[];
    const row = mine.find((e) => e.id === ev.id);
    assert.ok(row, "evento aparece para a co-organizadora");
    assert.equal(row.myRole, "co");
    assert.equal(((await api("/organizer/events", { token: T["org"] })).body as any[]).find((e) => e.id === ev.id).myRole, "owner");
    // pode abrir o painel, editar e criar cupom
    assert.equal((await api(`/organizer/events/${ev.id}`, { token: T["ana"] })).status, 200);
    assert.equal((await api(`/organizer/events/${ev.id}`, { method: "PATCH", token: T["ana"], body: { venue: "Galpão Novo" } })).status, 200);
    assert.equal((await api(`/organizer/events/${ev.id}/coupons`, { token: T["ana"], body: { code: "ANA10", kind: "percent", value: 10 } })).status, 201);
    // portaria
    assert.ok(((await api("/checkin/events", { token: T["ana"] })).body as any[]).some((e) => e.id === ev.id));
    // não pode remover o evento nem convidar
    assert.equal((await api(`/organizer/events/${ev.id}`, { method: "DELETE", token: T["ana"] })).status, 403);
    assert.equal((await api(`/organizer/events/${ev.id}/organizers`, { token: T["ana"], body: { email: "bia@t.dev" } })).status, 403);
    // lista
    const list = (await api(`/organizer/events/${ev.id}/organizers`, { token: T["ana"] })).body;
    assert.equal(list.owner.email, "org@t.dev");
    assert.deepEqual(list.organizers.map((o: any) => o.email), ["ana@t.dev"]);
  });

  it("dono tira o co-organizador e ele perde o acesso; co-organizador pode sair sozinho", async () => {
    const ev = await event("Festa Sem a Ana");
    await api(`/organizer/events/${ev.id}/organizers`, { token: T["org"], body: { email: "ana@t.dev" } });
    const anaId = (await api(`/organizer/events/${ev.id}/organizers`, { token: T["org"] })).body.organizers[0].id;
    assert.equal((await api(`/organizer/events/${ev.id}/organizers/${anaId}`, { method: "DELETE", token: T["org"] })).status, 204);
    assert.equal((await api(`/organizer/events/${ev.id}`, { token: T["ana"] })).status, 403);
    // de novo, e agora ela mesma sai
    await api(`/organizer/events/${ev.id}/organizers`, { token: T["org"], body: { email: "ana@t.dev" } });
    assert.equal((await api(`/organizer/events/${ev.id}/organizers/${anaId}`, { method: "DELETE", token: T["ana"] })).status, 204);
    assert.equal((await api(`/organizer/events/${ev.id}`, { token: T["ana"] })).status, 403);
    // co-organizador não tira outra pessoa
    await api(`/organizer/events/${ev.id}/organizers`, { token: T["org"], body: { email: "ana@t.dev" } });
    await api(`/organizer/events/${ev.id}/organizers`, { token: T["org"], body: { email: "bia@t.dev" } });
    const biaId = (await api(`/organizer/events/${ev.id}/organizers`, { token: T["org"] })).body.organizers.find((o: any) => o.email === "bia@t.dev").id;
    assert.equal((await api(`/organizer/events/${ev.id}/organizers/${biaId}`, { method: "DELETE", token: T["ana"] })).status, 403);
  });
});
