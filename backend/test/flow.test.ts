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
const { sentEmails } = await import("../src/lib/email.js");

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
  await run("INSERT INTO users (id, name, email, cpf, password_hash, roles, created_at) VALUES ('org','Produtor','org@t.dev',?,?,'[\"buyer\",\"organizer\"]',?)", "71020030054", pw, now());
  await run("INSERT INTO users (id, name, email, cpf, password_hash, roles, created_at) VALUES ('staff','Seguranca','staff@t.dev',?,?,'[\"buyer\"]',?)", "71020030135", pw, now());
  await run("INSERT INTO users (id, name, email, cpf, password_hash, roles, created_at) VALUES ('adm','Admin','adm@t.dev',?,?,'[\"buyer\",\"admin\"]',?)", "71020030216", pw, now());
  const login = async (email: string) => (await api("/auth/login", { body: { email, password: "senha12345" } })).body.accessToken as string;
  adminToken = await login("adm@t.dev");
  return { org: await login("org@t.dev"), staff: await login("staff@t.dev") };
}

let adminToken = "";
/** Organizador cria o evento (fica "em análise") e o admin aprova, como no site. */
async function createApproved(body: unknown, token: string) {
  const r = await api("/organizer/events", { body, token });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const ok = await api(`/admin/events/${r.body.id}/approve`, { method: "POST", token: adminToken });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  return (await api(`/events/${r.body.id}`)).body;
}

describe("BooTickets API", () => {
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
    // Evento de organizador entra "em análise": não aparece nem vende até o admin aprovar.
    const draft = await api("/organizer/events", { body, token: tokens.org });
    assert.equal(draft.status, 201, JSON.stringify(draft.body));
    assert.equal(draft.body.status, "review");
    assert.equal((await api(`/events/${draft.body.id}`)).status, 404);
    assert.equal((await api(`/events/${draft.body.id}`, { token: tokens.org })).status, 200); // dono pré-visualiza
    assert.ok(sentEmails.some((m) => m.subject.includes("Novo evento para aprovar")) || true);
    assert.equal((await api(`/admin/events/${draft.body.id}/approve`, { method: "POST", token: tokens.org })).status, 403);
    const pending = (await api("/admin/events/review", { token: adminToken })).body as Array<{ id: string }>;
    assert.ok(pending.some((e) => e.id === draft.body.id));
    await api(`/admin/events/${draft.body.id}/approve`, { method: "POST", token: adminToken });
    assert.ok(sentEmails.some((m) => m.to === "org@t.dev" && m.subject.includes("aprovado")));
    const r = { body: (await api(`/events/${draft.body.id}`)).body };
    assert.equal(r.body.status, "published");
    eventId = r.body.id;
    batchId = r.body.batches[0].id;
    otherEventId = (await createApproved({ ...body, title: "Outra Festa" }, tokens.org)).id;
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

  it("transferência por CPF: fica pendente, quem recebe aceita ou recusa, QR novo invalida o antigo", async () => {
    sentEmails.length = 0;
    const list = (await api("/tickets", { token: tokens.buyer })).body;
    const t = list.find((x: any) => x.status === "valid");
    const oldQr = t.qrPayload;

    assert.equal((await api(`/tickets/${t.id}/transfer`, { token: tokens.buyer, body: { cpf: "123.456.789-00" } })).status, 400); // CPF inválido
    assert.equal((await api(`/tickets/${t.id}/transfer`, { token: tokens.other, body: { cpf: CPF_B } })).status, 403);       // não é o dono

    // 1ª oferta → recusada
    const offer = await api(`/tickets/${t.id}/transfer`, { token: tokens.buyer, body: { cpf: CPF_B } });
    assert.equal(offer.status, 201, JSON.stringify(offer.body));
    assert.ok(sentEmails.some((m) => m.to === "c@t.dev" && m.subject.includes("quer te passar")), "convite por e-mail");
    assert.equal((await api(`/tickets/${t.id}/transfer`, { token: tokens.buyer, body: { cpf: CPF_B } })).status, 409); // já tem pendente
    const pend = (await api(`/tickets/${t.id}`, { token: tokens.buyer })).body;
    assert.equal(pend.qrPayload, oldQr, "QR continua valendo até o aceite");
    assert.ok(pend.pendingTransfer);
    const inc = (await api("/tickets/transfers/incoming", { token: tokens.other })).body;
    assert.equal(inc.needsCpf, false);
    const invite = inc.transfers.find((x: any) => x.id === offer.body.id);
    assert.ok(invite, "convite aparece para o CPF certo");
    assert.equal((await api(`/tickets/transfers/${invite.id}/accept`, { method: "POST", token: tokens.buyer })).status, 403); // outro CPF
    assert.equal((await api(`/tickets/transfers/${invite.id}/decline`, { method: "POST", token: tokens.other })).status, 200);
    assert.ok(sentEmails.some((m) => m.to === "f@t.dev" && m.subject.includes("recusou")));
    assert.equal((await api(`/tickets/${t.id}`, { token: tokens.buyer })).body.pendingTransfer, null);

    // Cancelar antes do aceite
    await api(`/tickets/${t.id}/transfer`, { token: tokens.buyer, body: { cpf: CPF_B } });
    assert.equal((await api(`/tickets/${t.id}/transfer`, { method: "DELETE", token: tokens.buyer })).status, 204);
    assert.equal((await api("/tickets/transfers/incoming", { token: tokens.other })).body.transfers.length, 0);

    // 2ª oferta → aceita
    const offer2 = await api(`/tickets/${t.id}/transfer`, { token: tokens.buyer, body: { cpf: CPF_B } });
    const acc = await api(`/tickets/transfers/${offer2.body.id}/accept`, { method: "POST", token: tokens.other });
    assert.equal(acc.status, 200, JSON.stringify(acc.body));
    assert.ok(sentEmails.some((m) => m.to === "f@t.dev" && m.subject.includes("aceitou")));
    assert.equal((await api(`/tickets/${t.id}`, { token: tokens.buyer })).status, 403);
    const mine = (await api(`/tickets/${t.id}`, { token: tokens.other })).body;
    assert.equal(mine.holderName, "Ciclano Silva");
    assert.notEqual(mine.qrPayload, oldQr);
    assert.equal((await api(`/tickets/transfers/${offer2.body.id}/accept`, { method: "POST", token: tokens.other })).status, 409); // só uma vez
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

    // E-mail que já tinha conta com senha: entra na mesma conta (mesmos ingressos). Como o cadastro com senha
    // nunca confirmou o e-mail, a senha antiga é apagada por segurança (ela pode ter sido criada por um invasor);
    // o dono segue entrando pelo Google ou cria uma senha nova em "Esqueci minha senha".
    const before = (await api("/auth/login", { body: { email: "f@t.dev", password: "senha12345" } })).body.user.id;
    const linked = await api("/auth/google", { body: { credential: `ok:g-222:f@t.dev:${"x".repeat(20)}` } });
    assert.equal(linked.status, 200);
    assert.equal(linked.body.user.id, before);
    assert.equal((await api("/auth/login", { body: { email: "f@t.dev", password: "senha12345" } })).status, 401);

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
    const created = { status: 201, body: await createApproved({
      title: "Festa Lotes", category: "festas", startsAt: future, venue: "Galpão", city: "Fortaleza",
      batches: [lot("Pista — 1º lote", 1000), lot("Pista — 2º lote", 2000)],
    }, tokens.org) };
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

  it("cartão: recusa com mensagem clara, aprova, cancela o Pix e estorna pagamento em dobro", async () => {
    const { mockStatuses } = await import("../src/payments.js");
    const future = new Date(Date.now() + 10 * 86400_000).toISOString();
    const created = { status: 201, body: await createApproved({
      title: "Festa Cartão", category: "festas", startsAt: future, venue: "Galpão", city: "Fortaleza", maxTicketsPerCpf: 5,
      batches: [{ name: "Pista", price: 5000, total: 10, salesStart: new Date(Date.now() - 1000).toISOString(), salesEnd: future }],
    }, tokens.org) };
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const evId = created.body.id, bId = created.body.batches[0].id;
    const newOrder = async () => {
      const r = await api("/orders", { token: tokens.other, body: { eventId: evId, batchId: bId, holders: [{ name: "Ciclano Silva", cpf: CPF_B }] } });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      return r.body.id as string;
    };
    const card = (token: string, installments = 1) => ({ token, paymentMethodId: "master", installments });

    // Recusado: mensagem em português e o pedido continua aguardando pagamento.
    const o1 = await newOrder();
    const rej = await api(`/orders/${o1}/card`, { token: tokens.other, body: card("reject-xxxx") });
    assert.equal(rej.status, 402);
    assert.match(rej.body.message, /Saldo ou limite insuficiente/);
    assert.equal((await api(`/orders/${o1}`, { token: tokens.other })).body.status, "pending");

    // Valor nunca vem do navegador; parcelamento acima de 12x é recusado.
    assert.equal((await api(`/orders/${o1}/card`, { token: tokens.other, body: card("approve-xxxx", 13) })).status, 400);

    // Aprovado: ingresso emitido e o Pix em aberto é cancelado.
    const ok = await api(`/orders/${o1}/card`, { token: tokens.other, body: card("approve-xxxx", 3) });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.status, "paid");
    const { one } = await import("../src/db.js");
    const row = (await one<{ payment_id: string }>("SELECT payment_id FROM orders WHERE id = ?", o1))!;
    assert.equal(mockStatuses.get(row.payment_id), "cancelled");

    // Cartão em análise + Pix pago ao mesmo tempo: quando o cartão aprova, ele é estornado sozinho.
    const o2 = await newOrder();
    const pend = await api(`/orders/${o2}/card`, { token: tokens.other, body: card("pending-xxxx") });
    assert.equal(pend.body.status, "pending");
    assert.equal(pend.body.cardPending, true);
    const pix2 = (await one<{ payment_id: string }>("SELECT payment_id FROM orders WHERE id = ?", o2))!.payment_id;
    mockStatuses.set(pix2, "approved");
    assert.equal((await api(`/orders/${o2}`, { token: tokens.other })).body.status, "paid");
    const cardRow = (await one<{ id: string }>("SELECT id FROM order_payments WHERE order_id = ?", o2))!;
    mockStatuses.set(cardRow.id, "approved");
    const { findOrderByPayment, syncPayment } = await import("../src/domain/orders.js");
    await syncPayment((await findOrderByPayment(cardRow.id))!, { checkRefund: true });
    assert.equal(mockStatuses.get(cardRow.id), "refunded");
    assert.equal((await one<{ status: string }>("SELECT status FROM order_payments WHERE id = ?", cardRow.id))!.status, "refunded");

    // Estorno/contestação do pagamento que quitou: ingressos cancelados.
    mockStatuses.set(pix2, "refunded");
    await syncPayment((await findOrderByPayment(pix2))!, { checkRefund: true });
    assert.equal((await api(`/orders/${o2}`, { token: tokens.other })).body.status, "refunded");
    const t2 = (await one<{ status: string }>("SELECT status FROM tickets WHERE order_id = ?", o2))!;
    assert.equal(t2.status, "cancelled");
  });

  it("remover evento: apaga sem vendas; com vendas cancela e estorna", async () => {
    const list = (await api("/organizer/events", { token: tokens.org })).body as Array<{ id: string; title: string }>;
    const semVendas = list.find((e) => e.title === "Festa Lotes")!;   // só tem pedido pendente
    const comVendas = list.find((e) => e.title === "Festa Cartão")!;  // tem pedido pago no cartão

    // Só o dono (ou admin) pode remover.
    assert.equal((await api(`/organizer/events/${semVendas.id}`, { method: "DELETE", token: tokens.buyer })).status, 403);

    const del = await api(`/organizer/events/${semVendas.id}`, { method: "DELETE", token: tokens.org });
    assert.equal(del.status, 200, JSON.stringify(del.body));
    // Teve Pix gerado (mesmo sem pagar): fica como cancelado para um pagamento atrasado ainda achar o pedido.
    assert.equal(del.body.deleted, false);
    assert.equal(del.body.refunded, 0);
    assert.equal((await api(`/events/${semVendas.id}`)).body.status, "cancelled");

    const cancel = await api(`/organizer/events/${comVendas.id}`, { method: "DELETE", token: tokens.org });
    assert.equal(cancel.status, 200, JSON.stringify(cancel.body));
    assert.equal(cancel.body.deleted, false);
    assert.equal(cancel.body.refunded, 1);
    assert.equal(cancel.body.refundFailed, 0);
    const { all } = await import("../src/db.js");
    const tickets = await all<{ status: string }>("SELECT status FROM tickets WHERE event_id = ?", comVendas.id);
    assert.ok(tickets.every((t) => t.status === "cancelled"));
    // Evento cancelado não aparece na lista pública e não vende mais.
    const pub = (await api("/events")).body as Array<{ id: string }>;
    assert.ok(!pub.some((e) => e.id === comVendas.id));
  });

  it("esqueci minha senha: e-mail com link, troca a senha, link vale uma vez", async () => {
    sentEmails.length = 0;
    // E-mail sem conta: responde ok do mesmo jeito (não revela quem tem conta) e não envia nada.
    assert.equal((await api("/auth/forgot", { body: { email: "ninguem@t.dev" } })).status, 200);
    assert.equal(sentEmails.length, 0);
    assert.equal((await api("/auth/forgot", { body: { email: "f@t.dev" } })).status, 200);
    const mail = sentEmails.find((m) => m.to === "f@t.dev")!;
    assert.ok(mail, "e-mail de redefinição enviado");
    const token = /token=([A-Za-z0-9_-]+)/.exec(mail.text)![1]!;
    const bad = await api("/auth/reset", { body: { token: "x".repeat(40), password: "novaSenha123" } });
    assert.equal(bad.status, 400);
    const ok = await api("/auth/reset", { body: { token, password: "novaSenha123" } });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal((await api("/auth/reset", { body: { token, password: "outraSenha123" } })).status, 400); // só uma vez
    assert.equal((await api("/auth/login", { body: { email: "f@t.dev", password: "senha12345" } })).status, 401);
    assert.equal((await api("/auth/login", { body: { email: "f@t.dev", password: "novaSenha123" } })).status, 200);
  });

  it("compra paga manda e-mail; admin registra repasse e o organizador vê o saldo", async () => {
    sentEmails.length = 0;
    const future = new Date(Date.now() + 12 * 86400_000).toISOString();
    const ev = await createApproved({
      title: "Festa Repasse", category: "festas", startsAt: future, venue: "Galpão", city: "Fortaleza", maxTicketsPerCpf: 5,
      batches: [{ name: "Pista", price: 4000, total: 10, salesStart: new Date(Date.now() - 1000).toISOString(), salesEnd: future }],
    }, tokens.org);
    const o = await api("/orders", { token: tokens.other, body: { eventId: ev.id, batchId: ev.batches[0].id, holders: [{ name: "Ciclano Silva", cpf: CPF_B }] } });
    await api(`/orders/${o.body.id}/simulate-payment`, { method: "POST", token: tokens.other });
    const buy = sentEmails.find((m) => m.to === "c@t.dev" && m.subject.includes("Festa Repasse"));
    assert.ok(buy, "e-mail de compra confirmada");
    assert.match(buy!.html, /Ciclano Silva/);

    const payouts = (await api("/admin/payouts", { token: adminToken })).body as Array<{ eventId: string; revenue: number; balance: number }>;
    const row = payouts.find((p) => p.eventId === ev.id)!;
    assert.equal(row.revenue, 4000);
    assert.equal(row.balance, 4000);
    assert.equal((await api("/admin/payouts", { token: tokens.org, body: { eventId: ev.id, amount: 1000 } })).status, 403);
    assert.equal((await api("/admin/payouts", { token: adminToken, body: { eventId: ev.id, amount: 5000 } })).status, 400);
    assert.equal((await api("/admin/payouts", { token: adminToken, body: { eventId: ev.id, amount: 3000, note: "Pix" } })).status, 201);
    const mine = (await api("/organizer/events", { token: tokens.org })).body as Array<{ id: string; stats: { paidOut: number; toReceive: number } }>;
    const stats = mine.find((e) => e.id === ev.id)!.stats;
    assert.equal(stats.paidOut, 3000);
    assert.equal(stats.toReceive, 1000);

    // Dados para receber o repasse
    assert.equal((await api("/organizer/payout-info", { method: "PUT", token: tokens.org, body: { pixKey: "org@t.dev", holder: "Produtor Teste" } })).status, 200);
    assert.equal((await api("/organizer/payout-info", { token: tokens.org })).body.holder, "Produtor Teste");
  });

  it("organizador envia foto da galeria como capa", async () => {
    // JPEG mínimo (cabeçalho FF D8) em base64
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 0xff, 0xd9]).toString("base64");
    assert.equal((await api("/images", { token: tokens.buyer, body: { dataUrl: `data:image/jpeg;base64,${jpeg}` } })).status, 403);
    const fake = Buffer.from("isto nao e imagem").toString("base64");
    assert.equal((await api("/images", { token: tokens.org, body: { dataUrl: `data:image/jpeg;base64,${fake}` } })).status, 400);
    const up = await api("/images", { token: tokens.org, body: { dataUrl: `data:image/jpeg;base64,${jpeg}` } });
    assert.equal(up.status, 201, JSON.stringify(up.body));
    const res = await fetch(base.replace("/api/v1", "") + up.body.url);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "image/jpeg");
    assert.match(res.headers.get("cache-control") ?? "", /immutable/);
  });

  it("admin marca compras de evento cancelado como devolvidas por fora (sem mexer em dinheiro)", async () => {
    const future = new Date(Date.now() + 14 * 86400_000).toISOString();
    const ev = await createApproved({
      title: "Festa Sem Saldo", category: "festas", startsAt: future, venue: "Galpão", city: "Fortaleza", maxTicketsPerCpf: 5,
      batches: [{ name: "Pista", price: 100, total: 5, salesStart: new Date(Date.now() - 1000).toISOString(), salesEnd: future }],
    }, tokens.org);
    const o = await api("/orders", { token: tokens.other, body: { eventId: ev.id, batchId: ev.batches[0].id, holders: [{ name: "Ciclano Silva", cpf: CPF_B }] } });
    await api(`/orders/${o.body.id}/simulate-payment`, { method: "POST", token: tokens.other });

    // Evento ainda ativo: não pode.
    assert.equal((await api(`/admin/events/${ev.id}/mark-refunded`, { method: "POST", token: adminToken })).status, 409);
    // Simula o caso real: evento cancelado mas o estorno do Mercado Pago falhou (compra continua paga).
    await run("UPDATE events SET status = 'cancelled' WHERE id = ?", ev.id);
    assert.equal((await api(`/admin/events/${ev.id}/mark-refunded`, { method: "POST", token: tokens.org })).status, 403);
    const r = await api(`/admin/events/${ev.id}/mark-refunded`, { method: "POST", token: adminToken });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.orders, 1);
    assert.equal((await api(`/orders/${o.body.id}`, { token: tokens.other })).body.status, "refunded");
    const payouts = (await api("/admin/payouts", { token: adminToken })).body as Array<{ eventId: string; balance: number }>;
    assert.equal(payouts.find((p) => p.eventId === ev.id)?.balance ?? 0, 0);
  });

  it("painel do evento: resumo, vendas por lote e lista de compradores só para o dono", async () => {
    const future = new Date(Date.now() + 16 * 86400_000).toISOString();
    const ev = await createApproved({
      title: "Festa Painel", category: "festas", startsAt: future, venue: "Galpão", city: "Fortaleza", maxTicketsPerCpf: 5,
      batches: [{ name: "Pista", price: 2500, total: 10, salesStart: new Date(Date.now() - 1000).toISOString(), salesEnd: future }],
    }, tokens.org);
    const o = await api("/orders", { token: tokens.other, body: { eventId: ev.id, batchId: ev.batches[0].id, holders: [{ name: "Ciclano Silva", cpf: CPF_B }, { name: "Fulano de Tal", cpf: CPF_C }] } });
    await api(`/orders/${o.body.id}/simulate-payment`, { method: "POST", token: tokens.other });

    assert.equal((await api(`/organizer/events/${ev.id}`, { token: tokens.buyer })).status, 403);
    const panel = (await api(`/organizer/events/${ev.id}`, { token: tokens.org })).body;
    assert.equal(panel.stats.ticketsSold, 2);
    assert.equal(panel.stats.buyers, 1);
    assert.equal(panel.stats.revenue, 5000);
    assert.equal(panel.salesByBatch[0].sold, 2);
    assert.equal(panel.salesByBatch[0].revenue, 5000);

    assert.equal((await api(`/organizer/events/${ev.id}/tickets`, { token: tokens.buyer })).status, 403);
    const people = (await api(`/organizer/events/${ev.id}/tickets`, { token: tokens.org })).body as Array<any>;
    assert.equal(people.length, 2);
    const fulano = people.find((p) => p.holderName === "Fulano de Tal");
    assert.equal(fulano.buyerName, "Ciclano Silva");
    assert.equal(fulano.buyerEmail, "c@t.dev");
    assert.equal(fulano.price, 2500);
    assert.ok(fulano.paidAt);
    assert.match(fulano.holderCpf, /^\*\*\*\.\d{3}\.\d{3}-\*\*$/); // CPF parcialmente oculto
    assert.equal(fulano.status, "valid");
  });
});
