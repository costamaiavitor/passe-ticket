// Portaria sem QR (plano B): busca por CPF, nome ou código curto e liberação manual.
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
    body: opts.body !== undefined ? JSON.stringify(path === "/orders" && opts.body && typeof opts.body === "object" && !("acceptTerms" in opts.body) ? { acceptTerms: true, ...opts.body } : path === "/organizer/events" && opts.body && typeof opts.body === "object" && !("acceptOrganizerTerms" in opts.body) ? { acceptOrganizerTerms: true, ...opts.body } : opts.body) : null,
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
const C: Record<string, string> = { org: cpf("610200300"), adm: cpf("610200301"), ana: cpf("610200302"), bia: cpf("610200303") };

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

describe("Portaria: plano B sem QR", () => {
  let ev: any; let ticketId = ""; let qr = "";
  before(async () => {
    await user("org", '["buyer","organizer"]');
    await user("adm", '["buyer","admin"]');
    await user("ana");
    await user("bia");
    ev = await event("Festa da Portaria");
    await buyPaid("ana", ev);
    const t = (await api("/tickets", { token: T["ana"] })).body[0];
    ticketId = t.id; qr = t.qrPayload;
  });

  it("quem não é da equipe não busca nem libera", async () => {
    assert.equal((await api(`/checkin/events/${ev.id}/search?q=${C["ana"]}`, { token: T["bia"] })).status, 403);
    assert.equal((await api("/checkin/manual", { token: T["bia"], body: { eventId: ev.id, ticketId } })).status, 403);
  });

  it("acha pelo CPF (com ou sem pontos), pelo nome e pelo código curto", async () => {
    const fmt = C["ana"]!.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    for (const q of [C["ana"]!, fmt, "pessoa te", `#${ticketId.slice(0, 8)}`, ticketId.slice(0, 6)]) {
      const r = await api(`/checkin/events/${ev.id}/search?q=${encodeURIComponent(q)}`, { token: T["org"] });
      assert.equal(r.status, 200, q);
      assert.ok(r.body.some((x: any) => x.id === ticketId), `não achou com "${q}"`);
      assert.ok(!JSON.stringify(r.body).includes(C["ana"]!), "CPF completo não pode aparecer");
    }
    const none = await api(`/checkin/events/${ev.id}/search?q=ab`, { token: T["org"] });
    assert.deepEqual(none.body, [], "busca curta demais não devolve nada");
    const wildcard = await api(`/checkin/events/${ev.id}/search?q=${encodeURIComponent("%%%")}`, { token: T["org"] });
    assert.deepEqual(wildcard.body, [], "% não vira 'qualquer coisa'");
  });

  it("libera uma vez só; depois o QR também acusa 'já utilizado'", async () => {
    const r1 = await api("/checkin/manual", { token: T["org"], body: { eventId: ev.id, ticketId } });
    assert.equal(r1.status, 200);
    assert.equal(r1.body.result, "ok");
    const r2 = await api("/checkin/manual", { token: T["org"], body: { eventId: ev.id, ticketId } });
    assert.equal(r2.body.result, "already_used");
    const scan = await api("/checkin/scan", { token: T["org"], body: { eventId: ev.id, code: qr } });
    assert.equal(scan.body.result, "already_used");
    const s = await api(`/checkin/events/${ev.id}/search?q=${C["ana"]}`, { token: T["org"] });
    assert.equal(s.body[0].status, "used");
  });

  it("ingresso de outro evento não entra", async () => {
    const other = await event("Outra Festa");
    const r = await api("/checkin/manual", { token: T["org"], body: { eventId: other.id, ticketId } });
    assert.equal(r.body.result, "wrong_event");
  });

  it("ingresso devolvido não aparece na busca e não entra", async () => {
    const ev2 = await event("Festa Devolvida");
    const orderId = await buyPaid("bia", ev2);
    const t = (await api("/tickets", { token: T["bia"] })).body.find((x: any) => x.event.id === ev2.id);
    assert.equal((await api(`/orders/${orderId}/refund`, { method: "POST", token: T["bia"] })).status, 200);
    const s = await api(`/checkin/events/${ev2.id}/search?q=${C["bia"]}`, { token: T["org"] });
    assert.deepEqual(s.body, []);
    const r = await api("/checkin/manual", { token: T["org"], body: { eventId: ev2.id, ticketId: t.id } });
    assert.equal(r.body.result, "cancelled");
  });
});
