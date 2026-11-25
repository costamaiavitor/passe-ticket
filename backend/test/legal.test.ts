// Provas jurídicas: aceite dos Termos do Organizador e registro de acessos (Marco Civil, art. 15).
process.env["NODE_ENV"] = "test";
process.env["PAYMENT_PROVIDER"] = "mock";

import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

const { createApp } = await import("../src/app.js");
const { all, one } = await import("../src/db.js");
const { config } = await import("../src/config.js");

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

function cpf(nine: string) {
  const d = nine.split("").map(Number);
  for (const n of [9, 10]) { let s = 0; for (let i = 0; i < n; i++) s += d[i]! * (n + 1 - i); d.push((s * 10) % 11 % 10); }
  return d.join("");
}
const future = (days = 10) => new Date(Date.now() + days * 86400_000).toISOString();
const eventBody = (extra: Record<string, unknown> = {}) => ({
  title: "Festa Jurídica", category: "festas", startsAt: future(), venue: "Galpão", city: "Fortaleza", maxTicketsPerCpf: 4,
  batches: [{ name: "Pista", ticketType: "Pista", price: 5000, total: 10, salesStart: new Date(Date.now() - 1000).toISOString(), salesEnd: future() }],
  ...extra,
});

describe("Provas jurídicas", () => {
  let token = "";
  let userId = "";

  it("cadastro e login ficam no registro de acessos com IP e navegador", async () => {
    const r = await api("/auth/register", { body: { name: "Lia Produtora", email: "lia@t.dev", cpf: cpf("500600700"), password: "senha12345" } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    userId = r.body.user.id;
    assert.equal(r.body.user.organizerTermsOk, false);
    const l = await api("/auth/login", { body: { email: "lia@t.dev", password: "senha12345" } });
    token = l.body.accessToken;
    const logs = await all<{ action: string; ip: string; user_agent: string }>("SELECT action, ip, user_agent FROM access_logs WHERE user_id = ? ORDER BY created_at", userId);
    assert.deepEqual(logs.map((x) => x.action), ["register", "login"]);
    assert.ok(logs.every((x) => x.ip.length > 0));
  });

  it("virar produtor exige aceitar os Termos do Organizador e guarda a prova", async () => {
    const no = await api("/auth/become-organizer", { method: "POST", token, body: {} });
    assert.equal(no.status, 400);
    assert.equal(no.body.code, "ORGANIZER_TERMS_REQUIRED");
    const ok = await api("/auth/become-organizer", { method: "POST", token, body: { acceptOrganizerTerms: true } });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.user.organizerTermsOk, true);
    token = ok.body.accessToken;
    const u = (await one<any>("SELECT organizer_terms_version, organizer_terms_at, organizer_terms_ip FROM users WHERE id = ?", userId))!;
    assert.equal(u.organizer_terms_version, config.organizerTermsVersion);
    assert.ok(u.organizer_terms_at && u.organizer_terms_ip);
  });

  it("produtor com termos antigos precisa aceitar a versão nova para criar evento", async () => {
    const { run } = await import("../src/db.js");
    await run("UPDATE users SET organizer_terms_version = '2020-01-01' WHERE id = ?", userId);
    const no = await api("/organizer/events", { token, body: eventBody({ acceptOrganizerTerms: false }) });
    assert.equal(no.status, 409);
    assert.equal(no.body.code, "ORGANIZER_TERMS_REQUIRED");
    const ok = await api("/organizer/events", { token, body: eventBody({ acceptOrganizerTerms: true }) });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    assert.equal((await one<any>("SELECT organizer_terms_version v FROM users WHERE id = ?", userId))!.v, config.organizerTermsVersion);
    // Já aceita: o próximo evento não pede de novo.
    assert.equal((await api("/organizer/events", { token, body: eventBody({ title: "Outra Festa", acceptOrganizerTerms: false }) })).status, 201);
  });

  it("aceite avulso pela rota /auth/organizer-terms", async () => {
    const { run } = await import("../src/db.js");
    await run("UPDATE users SET organizer_terms_version = NULL WHERE id = ?", userId);
    assert.equal((await api("/auth/organizer-terms", { token, body: { accept: false } })).status, 400);
    const r = await api("/auth/organizer-terms", { token, body: { accept: true } });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.organizerTermsOk, true);
  });
});
