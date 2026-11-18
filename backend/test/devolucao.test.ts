// Devolução pelo comprador (7 dias, antes do evento) e aceite obrigatório dos Termos na compra.
process.env["NODE_ENV"] = "test";
process.env["PAYMENT_PROVIDER"] = "mock";
process.env["ADMIN_EMAILS"] = "adm@t.dev";

import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

const { createApp } = await import("../src/app.js");
const { run, now } = await import("../src/db.js");
const { hashPassword } = await import("../src/lib/crypto.js");
const { sentEmails } = await import("../src/lib/email.js");
const { mockRefundFail, mockStatuses } = await import("../src/payments.js");
const { one } = await import("../src/db.js");

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
const C: Record<string, string> = { org: cpf("100200300"), org2: cpf("100200301"), adm: cpf("100200302"), ana: cpf("100200303"), bia: cpf("100200304"), cau: cpf("100200305") };

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
const orderRow = (id: string) => one<{ status: string; terms_version: string | null; terms_accepted_at: string | null; terms_ip: string | null;
  terms_user_agent: string | null; payment_id: string; refund_by_buyer: boolean; refunded_at: string | null }>("SELECT * FROM orders WHERE id = ?", id);
/** Compra e paga (pagamento simulado). */
async function paid(who: string, ev: any, qty = 1) {
  const o = await buy(T[who]!, ev, C[who]!, {}, qty);
  assert.equal(o.status, 201, JSON.stringify(o.body));
  await api(`/orders/${o.body.id}/simulate-payment`, { method: "POST", token: T[who] });
  return o.body;
}
const refund = (who: string, id: string) => api(`/orders/${id}/refund`, { method: "POST", token: T[who] });
const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();

describe("Devolução e aceite dos Termos", () => {
  before(async () => {
    await user("org", '["buyer","organizer"]');
    await user("adm", '["buyer","admin"]');
    await user("ana"); await user("bia"); await user("cau");
  });

  it("não compra sem aceitar os Termos; com o aceite, guarda versão, data, IP e navegador", async () => {
    const ev = await event("Festa dos Termos");
    const no = await buy(T["ana"]!, ev, C["ana"]!, { acceptTerms: false });
    assert.equal(no.status, 400);
    assert.equal(no.body.code, "TERMS_REQUIRED");
    const o = await buy(T["ana"]!, ev, C["ana"]!);
    assert.equal(o.status, 201);
    const row = (await orderRow(o.body.id))!;
    assert.equal(row.terms_version, "2026-11-17");
    assert.ok(row.terms_accepted_at);
    assert.ok(row.terms_ip, "IP do aceite");
    assert.ok(row.terms_user_agent !== null);
  });

  it("devolve em até 7 dias: estorna o total, cancela os ingressos, libera a vaga e avisa por e-mail", async () => {
    const ev = await event("Festa Devolução", { batches: [lot({ total: 2 })] });
    const o = await paid("bia", ev, 2);
    const list = (await api("/orders", { token: T["bia"] })).body as any[];
    assert.ok(list.find((x) => x.id === o.id).refundableUntil, "aparece como devolvível");
    // só o dono devolve
    assert.equal((await refund("ana", o.id)).status, 403);
    const r = await refund("bia", o.id);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.status, "refunded");
    assert.equal(r.body.refundByBuyer, true);
    assert.equal(r.body.refundableUntil, null);
    const row = (await orderRow(o.id))!;
    assert.equal(mockStatuses.get(row.payment_id), "refunded", "estorno no Mercado Pago");
    assert.ok(row.refunded_at);
    assert.equal(((await api("/tickets", { token: T["bia"] })).body as any[]).filter((t) => t.event.id === ev.id).length, 0, "ingressos cancelados");
    // a vaga volta à venda
    const again = await buy(T["cau"]!, ev, C["cau"]!, {}, 2);
    assert.equal(again.status, 201, "as 2 vagas voltaram à venda: " + JSON.stringify(again.body));
    assert.ok(sentEmails.some((m) => m.to === "bia@t.dev" && m.subject.includes("Devolução feita")));
    // repetir não estorna de novo nem dá erro
    assert.equal((await refund("bia", o.id)).body.status, "refunded");
  });

  it("depois de 7 dias da compra não devolve", async () => {
    const ev = await event("Festa Fora do Prazo");
    const o = await paid("ana", ev);
    await run("UPDATE orders SET paid_at = ? WHERE id = ?", daysAgo(8), o.id);
    const r = await refund("ana", o.id);
    assert.equal(r.status, 409);
    assert.equal(r.body.code, "REFUND_EXPIRED");
    assert.match(r.body.message, /7 dias/);
    assert.equal((await orderRow(o.id))!.status, "paid");
  });

  it("depois que o evento começou não devolve, mesmo dentro dos 7 dias", async () => {
    const ev = await event("Festa Já Começou");
    const o = await paid("ana", ev);
    await run("UPDATE events SET starts_at = ? WHERE id = ?", daysAgo(0.01), ev.id);
    const r = await refund("ana", o.id);
    assert.equal(r.status, 409);
    assert.match(r.body.message, /já começou/);
  });

  it("ingresso usado ou transferido trava a devolução", async () => {
    const ev = await event("Festa Travas");
    const o1 = await paid("ana", ev);
    await run("UPDATE tickets SET status = 'used' WHERE order_id = ?", o1.id);
    assert.equal((await refund("ana", o1.id)).body.code, "TICKET_USED");
    const o2 = await paid("bia", ev);
    await run("UPDATE tickets SET owner_id = 'cau' WHERE order_id = ?", o2.id);
    assert.equal((await refund("bia", o2.id)).body.code, "TICKET_TRANSFERRED");
  });

  it("se o Mercado Pago recusar o estorno, os ingressos continuam valendo e os admins são avisados", async () => {
    const ev = await event("Festa Sem Saldo");
    const o = await paid("ana", ev);
    mockRefundFail.add((await orderRow(o.id))!.payment_id);
    const r = await refund("ana", o.id);
    assert.equal(r.status, 502);
    assert.equal(r.body.code, "REFUND_FAILED");
    assert.equal((await orderRow(o.id))!.status, "paid");
    assert.ok(sentEmails.some((m) => m.to === "adm@t.dev" && m.subject.includes("Devolução não concluída")));
  });
});
