// Testes de robustez: alguém tentando burlar o site, dados malformados, ações simultâneas e pagamentos fora de hora.
process.env["NODE_ENV"] = "test";
process.env["PAYMENT_PROVIDER"] = "mock";
process.env["ADMIN_EMAILS"] = "chefe@t.dev";
process.env["GOOGLE_CLIENT_ID"] = "test-client.apps.googleusercontent.com";
process.env["MP_WEBHOOK_SECRET"] = "segredo-de-teste-do-webhook";

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

const { createApp } = await import("../src/app.js");
const { run, one, now } = await import("../src/db.js");
const { hashPassword } = await import("../src/lib/crypto.js");
const { mockStatuses, verifyMercadoPagoSignature } = await import("../src/payments.js");
const { google } = await import("../src/lib/google.js");
const { findOrderByPayment, syncPayment, expireStaleOrders } = await import("../src/domain/orders.js");

let base = "";
const server = createApp().listen(0);
before(() => { base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`; });
after(() => server.close());

async function api<T = any>(path: string, opts: { method?: string; body?: unknown; token?: string; raw?: string } = {}) {
  const res = await fetch(base + path, {
    method: opts.method ?? (opts.body !== undefined || opts.raw !== undefined ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.raw ?? (opts.body !== undefined ? JSON.stringify(opts.body) : null),
  });
  const text = await res.text();
  let body: T;
  try { body = (text ? JSON.parse(text) : null) as T; } catch { body = text as T; }
  return { status: res.status, body };
}

// CPFs válidos (dígitos verificadores corretos) usados só nos testes
const CPFS = ["52998224725", "11144477735", "39053344705", "15350946056", "16899535009", "12345678909", "98765432100", "24681357928"];
const PW = "senha12345";
const T: Record<string, string> = {};

async function user(key: string, cpf: string, roles = '["buyer"]') {
  await run("INSERT INTO users (id, name, email, cpf, password_hash, roles, created_at) VALUES (?,?,?,?,?,?,?)",
    key, `Pessoa ${key}`, `${key}@t.dev`, cpf, await hashPassword(PW), roles, now());
  T[key] = (await api("/auth/login", { body: { email: `${key}@t.dev`, password: PW } })).body.accessToken;
}

const future = (days = 10) => new Date(Date.now() + days * 86400_000).toISOString();
async function event(title: string, opts: { total?: number; price?: number; maxPerCpf?: number; token?: string } = {}) {
  const r = await api("/organizer/events", { token: opts.token ?? T["org"], body: {
    title, category: "festas", startsAt: future(), venue: "Galpão", city: "Fortaleza", maxTicketsPerCpf: opts.maxPerCpf ?? 4,
    batches: [{ name: "Pista", price: opts.price ?? 1000, total: opts.total ?? 10, salesStart: new Date(Date.now() - 1000).toISOString(), salesEnd: future() }],
  } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal((await api(`/admin/events/${r.body.id}/approve`, { method: "POST", token: T["adm"] })).status, 200);
  return (await api(`/events/${r.body.id}`)).body;
}
const buy = (token: string, ev: any, holders: Array<[string, string]>) =>
  api("/orders", { token, body: { eventId: ev.id, batchId: ev.batches[0].id, holders: holders.map(([name, cpf]) => ({ name, cpf })) } });

describe("Robustez do Passe", () => {
  before(async () => {
    await user("org", CPFS[0]!, '["buyer","organizer"]');
    await user("org2", CPFS[1]!, '["buyer","organizer"]');
    await user("adm", CPFS[2]!, '["buyer","admin"]');
    await user("ana", CPFS[3]!);
    await user("bia", CPFS[4]!);
    await user("caio", CPFS[5]!);
  });

  // ---------------- Permissões ----------------
  it("toda rota protegida recusa quem não está logado (401)", async () => {
    const protegidas: Array<[string, string]> = [
      ["GET", "/auth/me"], ["GET", "/orders"], ["POST", "/orders"], ["GET", "/tickets"], ["GET", "/tickets/transfers/incoming"],
      ["GET", "/checkin/events"], ["POST", "/checkin/scan"], ["GET", "/organizer/events"], ["POST", "/organizer/events"],
      ["GET", "/organizer/payout-info"], ["GET", "/admin/payouts"], ["GET", "/admin/events/review"], ["POST", "/images"],
      ["PUT", "/auth/me/cpf"],
    ];
    for (const [method, path] of protegidas) {
      const r = await api(path, { method, ...(method === "GET" ? {} : { body: {} }) });
      assert.equal(r.status, 401, `${method} ${path} deveria exigir login (veio ${r.status})`);
    }
  });

  it("comprador comum não acessa área de organizador nem de admin (403)", async () => {
    for (const [method, path] of [["GET", "/organizer/events"], ["GET", "/admin/payouts"], ["GET", "/admin/users"], ["POST", "/admin/payouts"]] as const) {
      const r = await api(path, { method, token: T["ana"], ...(method === "POST" ? { body: { eventId: "x", amount: 1 } } : {}) });
      assert.equal(r.status, 403, `${method} ${path} (veio ${r.status})`);
    }
  });

  it("organizador não mexe no evento de outro organizador", async () => {
    const ev = await event("Festa do Org1");
    const tentativas: Array<[string, string, unknown?]> = [
      ["GET", `/organizer/events/${ev.id}`], ["GET", `/organizer/events/${ev.id}/tickets`], ["PATCH", `/organizer/events/${ev.id}`, { title: "Hackeado" }],
      ["DELETE", `/organizer/events/${ev.id}`], ["POST", `/organizer/events/${ev.id}/staff`, { email: "ana@t.dev" }],
    ];
    for (const [method, path, body] of tentativas) {
      const r = await api(path, { method, token: T["org2"], ...(body ? { body } : {}) });
      assert.equal(r.status, 403, `${method} ${path} (veio ${r.status})`);
    }
    assert.equal((await api(`/events/${ev.id}`)).body.title, "Festa do Org1");
  });

  it("ninguém vê o pedido ou o ingresso de outra pessoa", async () => {
    const ev = await event("Festa Privacidade");
    const o = await buy(T["ana"]!, ev, [["Ana Souza", CPFS[3]!]]);
    await api(`/orders/${o.body.id}/simulate-payment`, { method: "POST", token: T["ana"] });
    const ticket = (await api("/tickets", { token: T["ana"] })).body[0];
    assert.equal((await api(`/orders/${o.body.id}`, { token: T["bia"] })).status, 403);
    assert.equal((await api(`/orders/${o.body.id}/cancel`, { method: "POST", token: T["bia"] })).status, 403);
    assert.equal((await api(`/tickets/${ticket.id}`, { token: T["bia"] })).status, 403);
    assert.equal((await api(`/tickets/${ticket.id}/transfer`, { token: T["bia"], body: { cpf: CPFS[4] } })).status, 403);
  });

  // ---------------- Dados malformados ----------------
  it("dados malformados viram erro 4xx claro, nunca erro 500", async () => {
    const ev = await event("Festa Validação");
    const casos: Array<[string, Parameters<typeof api>[1]]> = [
      ["/orders", { token: T["ana"], raw: "{isto não é json" }],
      ["/orders", { token: T["ana"], body: { eventId: ev.id, batchId: ev.batches[0].id, holders: [] } }],
      ["/orders", { token: T["ana"], body: { eventId: ev.id, batchId: ev.batches[0].id, holders: [{ name: "A", cpf: "000" }] } }],
      ["/orders", { token: T["ana"], body: { eventId: ev.id, batchId: ev.batches[0].id, holders: Array(11).fill({ name: "Ana Souza", cpf: CPFS[3] }) } }],
      ["/orders", { token: T["ana"], body: { eventId: "nao-existe", batchId: "x", holders: [{ name: "Ana Souza", cpf: CPFS[3] }] } }],
      ["/orders", { token: T["ana"], body: { eventId: ev.id, batchId: "lote-de-outro", holders: [{ name: "Ana Souza", cpf: CPFS[3] }] } }],
      ["/organizer/events", { token: T["org"], body: { title: "x" } }],
      ["/organizer/events", { token: T["org"], body: { title: "Festa", category: "festas", startsAt: "ontem", venue: "G", city: "F" } }],
      ["/organizer/events", { token: T["org"], body: { title: "Festa ok", category: "festas", startsAt: future(), venue: "Galpão", city: "Fortaleza",
        batches: [{ name: "Pista", price: -500, total: 10, salesStart: future(0), salesEnd: future() }] } }],
      ["/auth/register", { body: { name: "Al", email: "nao-e-email", cpf: "1", password: "1" } }],
      ["/auth/login", { body: { email: "x" } }],
      ["/checkin/scan", { token: T["org"], body: { eventId: ev.id, code: "x".repeat(600) } }],
      ["/tickets/transfers/nao-existe/accept", { token: T["ana"], body: {} }],
      ["/images", { token: T["org"], body: { dataUrl: "data:text/html;base64,PHNjcmlwdD4=" } }],
    ];
    for (const [path, opts] of casos) {
      const r = await api(path, opts);
      assert.ok(r.status >= 400 && r.status < 500, `${path} ${JSON.stringify(opts?.body ?? opts?.raw)?.slice(0, 80)} → ${r.status}`);
      assert.ok(r.body?.message, `${path} deveria explicar o erro`);
    }
    assert.equal((await api("/events/id-que-nao-existe")).status, 404);
    assert.equal((await api("/rota-que-nao-existe")).status, 404);
  });

  it("busca com texto malicioso (SQL) não quebra nem vaza dados", async () => {
    for (const q of ["' OR 1=1 --", "%' ; DROP TABLE events; --", "?", "\\", "%%", "<script>alert(1)</script>"]) {
      const r = await api(`/events?q=${encodeURIComponent(q)}`);
      assert.equal(r.status, 200, q);
      assert.ok(Array.isArray(r.body));
    }
    assert.ok((await api("/events")).body.length > 0, "tabela de eventos continua inteira");
  });

  it("corpo gigante é recusado (sem derrubar o servidor)", async () => {
    const r = await api("/auth/login", { raw: JSON.stringify({ email: "a@t.dev", password: "x".repeat(400_000) }) });
    assert.equal(r.status, 413);
    assert.equal((await api("/events")).status, 200);
  });

  // ---------------- Ações simultâneas ----------------
  it("20 compras ao mesmo tempo num lote de 3 vagas: vende exatamente 3 (sem overbooking)", async () => {
    const ev = await event("Festa Concorrida", { total: 3, maxPerCpf: 1 });
    const buyers = ["ana", "bia", "caio"];
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) =>
      buy(T[buyers[i % 3]!]!, ev, [[`Pessoa ${i}`, CPFS[i % CPFS.length]!]])));
    const ok = results.filter((r) => r.status === 201).length;
    assert.equal(ok, 3, `vendeu ${ok}`);
    for (const r of results) assert.ok(r.status === 201 || r.status === 409, `status inesperado ${r.status}`);
    const b = (await one<{ sold: number; reserved: number; total: number }>("SELECT sold, reserved, total FROM batches WHERE id = ?", ev.batches[0].id))!;
    assert.ok(b.sold + b.reserved <= b.total);
  });

  it("limite por CPF vale mesmo com pedidos simultâneos", async () => {
    const ev = await event("Festa Limite CPF", { total: 50, maxPerCpf: 2 });
    const results = await Promise.all(Array.from({ length: 8 }, () => buy(T["ana"]!, ev, [["Ana Souza", CPFS[3]!]])));
    assert.equal(results.filter((r) => r.status === 201).length, 2);
  });

  it("dois cliques seguidos em 'registrar repasse' não passam do saldo", async () => {
    const ev = await event("Festa Repasse Duplo", { price: 1000 });
    const o = await buy(T["bia"]!, ev, [["Bia Lima", CPFS[4]!]]);
    await api(`/orders/${o.body.id}/simulate-payment`, { method: "POST", token: T["bia"] });
    const rs = await Promise.all([1, 2, 3].map(() => api("/admin/payouts", { token: T["adm"], body: { eventId: ev.id, amount: 1000 } })));
    assert.equal(rs.filter((r) => r.status === 201).length, 1);
  });

  it("aceitar a mesma transferência duas vezes ao mesmo tempo: só um aceite vale", async () => {
    const ev = await event("Festa Transferência Dupla");
    const o = await buy(T["caio"]!, ev, [["Caio Reis", CPFS[5]!]]);
    await api(`/orders/${o.body.id}/simulate-payment`, { method: "POST", token: T["caio"] });
    const t = (await api("/tickets", { token: T["caio"] })).body.find((x: any) => x.event.id === ev.id);
    const offer = await api(`/tickets/${t.id}/transfer`, { token: T["caio"], body: { cpf: CPFS[3] } });
    const rs = await Promise.all([1, 2].map(() => api(`/tickets/transfers/${offer.body.id}/accept`, { method: "POST", token: T["ana"] })));
    assert.equal(rs.filter((r) => r.status === 200).length, 1);
    const row = (await one<{ transfers: number }>("SELECT transfers FROM tickets WHERE id = ?", t.id))!;
    assert.equal(row.transfers, 1);
  });

  // ---------------- Pagamentos fora de hora ----------------
  it("Pix pago depois que a reserva expirou: vira ingresso se ainda há vaga", async () => {
    const ev = await event("Festa Pix Atrasado", { total: 5 });
    const o = await buy(T["bia"]!, ev, [["Bia Lima", CPFS[4]!]]);
    await run("UPDATE orders SET expires_at = ? WHERE id = ?", new Date(Date.now() - 1000).toISOString(), o.body.id);
    await expireStaleOrders();
    assert.equal((await api(`/orders/${o.body.id}`, { token: T["bia"] })).body.status, "expired");
    const pix = (await one<{ payment_id: string }>("SELECT payment_id FROM orders WHERE id = ?", o.body.id))!.payment_id;
    mockStatuses.set(pix, "approved");
    await syncPayment((await findOrderByPayment(pix))!, { checkRefund: true }); // o que o webhook faz
    assert.equal((await api(`/orders/${o.body.id}`, { token: T["bia"] })).body.status, "paid");
    assert.ok((await api("/tickets", { token: T["bia"] })).body.some((t: any) => t.event.id === ev.id && t.status === "valid"));
  });

  it("Pix pago atrasado e o lote esgotou nesse meio tempo: estorna sozinho", async () => {
    const ev = await event("Festa Esgotou", { total: 1 });
    const o1 = await buy(T["bia"]!, ev, [["Bia Lima", CPFS[4]!]]);
    await run("UPDATE orders SET expires_at = ? WHERE id = ?", new Date(Date.now() - 1000).toISOString(), o1.body.id);
    await expireStaleOrders();
    const o2 = await buy(T["caio"]!, ev, [["Caio Reis", CPFS[5]!]]); // pega a última vaga
    await api(`/orders/${o2.body.id}/simulate-payment`, { method: "POST", token: T["caio"] });
    const pix = (await one<{ payment_id: string }>("SELECT payment_id FROM orders WHERE id = ?", o1.body.id))!.payment_id;
    mockStatuses.set(pix, "approved");
    await syncPayment((await findOrderByPayment(pix))!, { checkRefund: true });
    assert.equal(mockStatuses.get(pix), "refunded");
    assert.equal((await one<{ status: string }>("SELECT status FROM orders WHERE id = ?", o1.body.id))!.status, "refunded");
  });

  it("Pix pago depois que o evento foi cancelado: não emite ingresso e estorna", async () => {
    const ev = await event("Festa Cancelada Antes do Pix");
    const o = await buy(T["ana"]!, ev, [["Ana Souza", CPFS[3]!]]);
    const pix = (await one<{ payment_id: string }>("SELECT payment_id FROM orders WHERE id = ?", o.body.id))!.payment_id;
    // Organizador cancela com o Pix ainda pendente; o banco do cliente liquida segundos depois.
    await api(`/organizer/events/${ev.id}`, { method: "DELETE", token: T["org"] });
    mockStatuses.set(pix, "approved");
    await syncPayment((await findOrderByPayment(pix))!, { checkRefund: true });
    assert.equal(mockStatuses.get(pix), "refunded");
    const tickets = (await api("/tickets", { token: T["ana"] })).body as any[];
    assert.ok(!tickets.some((t) => t.event.id === ev.id && t.status === "valid"));
  });

  // ---------------- Regras do organizador ----------------
  it("evento sem nenhuma compra é apagado de vez", async () => {
    const ev = await event("Festa Sem Ninguém");
    const r = await api(`/organizer/events/${ev.id}`, { method: "DELETE", token: T["org"] });
    assert.equal(r.body.deleted, true);
    assert.equal((await api(`/events/${ev.id}`)).status, 404);
  });

  it("organizador não cancela evento com vendas por fora do 'Remover' (sem estorno)", async () => {
    const ev = await event("Festa Anti-Golpe");
    const o = await buy(T["ana"]!, ev, [["Ana Souza", CPFS[3]!]]);
    await api(`/orders/${o.body.id}/simulate-payment`, { method: "POST", token: T["ana"] });
    assert.equal((await api(`/organizer/events/${ev.id}`, { method: "PATCH", token: T["org"], body: { status: "cancelled" } })).status, 400);
    assert.equal((await api(`/organizer/events/${ev.id}`, { method: "PATCH", token: T["org"], body: { status: "draft" } })).status, 409);
    assert.equal((await api(`/events/${ev.id}`)).body.status, "published");
  });

  it("editar o conteúdo de um evento já aprovado manda de volta para análise", async () => {
    const ev = await event("Festa Original");
    const r = await api(`/organizer/events/${ev.id}`, { method: "PATCH", token: T["org"], body: { title: "Show Famoso Falso" } });
    assert.equal(r.status, 200);
    assert.equal((await api(`/events/${ev.id}`)).status, 404, "sai do ar até nova aprovação");
    assert.equal((await api(`/admin/events/${ev.id}/approve`, { method: "POST", token: T["adm"] })).status, 200);
    assert.equal((await api(`/events/${ev.id}`)).body.title, "Show Famoso Falso");
  });

  // ---------------- Contas e segurança ----------------
  it("e-mail de admin só vira admin com e-mail confirmado (Google), não com cadastro por senha", async () => {
    const reg = await api("/auth/register", { body: { name: "Impostor", email: "chefe@t.dev", cpf: CPFS[6], password: PW } });
    assert.equal(reg.status, 201);
    assert.ok(!reg.body.user.roles.includes("admin"), "cadastro com senha não pode virar admin");
    google.verifyIdToken = async () => ({ sub: "g-chefe", email: "chefe@t.dev", name: "Chefe" });
    const g = await api("/auth/google", { body: { credential: "x".repeat(40) } });
    assert.equal(g.status, 200);
    assert.ok(g.body.user.roles.includes("admin"));
  });

  it("refresh token reutilizado derruba todas as sessões (roubo de sessão)", async () => {
    const l = await api("/auth/login", { body: { email: "bia@t.dev", password: PW } });
    const r1 = await api("/auth/refresh", { body: { refreshToken: l.body.refreshToken } });
    assert.equal(r1.status, 200);
    assert.equal((await api("/auth/refresh", { body: { refreshToken: l.body.refreshToken } })).status, 401);
    assert.equal((await api("/auth/refresh", { body: { refreshToken: r1.body.refreshToken } })).status, 401, "sessão nova também cai");
  });

  it("token de acesso adulterado é recusado", async () => {
    const [h, p, s] = T["ana"]!.split(".");
    const payload = JSON.parse(Buffer.from(p!, "base64url").toString());
    payload.roles = ["admin"];
    const forged = `${h}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${s}`;
    assert.equal((await api("/admin/payouts", { token: forged })).status, 401);
  });

  it("webhook do Mercado Pago: só aceita assinatura correta", () => {
    const ts = "1700000000", reqId = "req-1", dataId = "123456";
    const v1 = createHmac("sha256", "segredo-de-teste-do-webhook").update(`id:${dataId};request-id:${reqId};ts:${ts};`).digest("hex");
    assert.equal(verifyMercadoPagoSignature({ "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": reqId }, dataId), true);
    assert.equal(verifyMercadoPagoSignature({ "x-signature": `ts=${ts},v1=${v1.replace(/.$/, "0")}`, "x-request-id": reqId }, dataId), false);
    assert.equal(verifyMercadoPagoSignature({ "x-signature": `ts=${ts},v1=abc`, "x-request-id": reqId }, dataId), false);
    assert.equal(verifyMercadoPagoSignature({}, dataId), false);
  });

  it("QR Code: adulterado, de outro evento ou já usado nunca libera entrada", async () => {
    const ev = await event("Festa Portaria");
    const outro = await event("Outra Festa Portaria");
    await api(`/organizer/events/${ev.id}/staff`, { token: T["org"], body: { email: "caio@t.dev" } });
    const o = await buy(T["ana"]!, ev, [["Ana Souza", CPFS[3]!]]);
    await api(`/orders/${o.body.id}/simulate-payment`, { method: "POST", token: T["ana"] });
    const qr = (await api("/tickets", { token: T["ana"] })).body.find((t: any) => t.event.id === ev.id).qrPayload as string;
    const scan = (eventId: string, code: string, token = T["caio"]) => api("/checkin/scan", { token, body: { eventId, code } });
    assert.equal((await scan(ev.id, qr, T["bia"])).status, 403, "quem não é da equipe não escaneia");
    for (const fake of [qr.slice(0, -2) + "xx", qr.replace("PASSE1", "PASSE2"), "PASSE1.a.1.b", "", " "])
      if (fake.trim()) assert.equal((await scan(ev.id, fake)).body.ok, false, fake);
    const wrong = await api("/checkin/scan", { token: T["org"], body: { eventId: outro.id, code: qr } });
    assert.equal(wrong.body.result, "wrong_event");
    const both = await Promise.all([scan(ev.id, qr), scan(ev.id, qr), scan(ev.id, qr)]);
    assert.equal(both.filter((r) => r.body.ok).length, 1, "três leitores ao mesmo tempo: só uma entrada");
  });
});
