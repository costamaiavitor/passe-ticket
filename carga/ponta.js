// Cenário C: jornada completa sob carga, com novas pessoas chegando num ritmo fixo (RITMO por segundo):
// cadastro → abre o evento → compra → paga (Pix simulado) → vê o ingresso com QR → portaria lê o QR.
// Uso: k6 run -e RITMO=10 -e OFFSET=1000000 carga/ponta.js
import http from "k6/http";
import { check } from "k6";
import { Counter, Trend } from "k6/metrics";
import exec from "k6/execution";
import { BASE, cpf, headers } from "./comum.js";

const dados = JSON.parse(open("./dados/setup.json"));
const RITMO = Number(__ENV.RITMO || 5);
const OFFSET = Number(__ENV.OFFSET || 1000000);

const ok = new Counter("jornada_ok");
const falhou = new Counter("jornada_falhou");
const tempoJornada = new Trend("tempo_jornada", true);

export const options = {
  scenarios: {
    jornada: {
      executor: "constant-arrival-rate", rate: RITMO, timeUnit: "1s", duration: __ENV.DURACAO || "45s",
      preAllocatedVUs: Math.min(RITMO * 4, 2000), maxVUs: Math.min(RITMO * 40, 5000), gracefulStop: "60s",
    },
  },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max", "count"],
  thresholds: {
    "http_req_duration{passo:cadastro}": ["p(95)<2000"],
    "http_req_duration{passo:evento}": ["p(95)<2000"],
    "http_req_duration{passo:reserva}": ["p(95)<2000"],
    "http_req_duration{passo:pagamento}": ["p(95)<2000"],
    "http_req_duration{passo:ingressos}": ["p(95)<2000"],
    "http_req_duration{passo:portaria}": ["p(95)<2000"],
    tempo_jornada: ["p(95)<10000"],
    http_req_failed: ["rate<0.01"],
  },
};

/** Os celulares da portaria entram de novo (o acesso vale 15 minutos). */
export function setup() {
  return dados.staffEmails.map((email, i) => {
    const r = http.post(`${BASE}/auth/login`, JSON.stringify({ email, password: dados.senha }), headers(null, 900000 + i));
    return r.json("accessToken");
  });
}

function passo(nome, r, cond) {
  if (!check(r, { [nome]: cond })) {
    falhou.add(1, { passo: nome });
    console.warn(`${nome} falhou: ${r.status} ${String(r.body).slice(0, 160)}`);
    return false;
  }
  return true;
}

export default function (staffTokens) {
  const n = OFFSET + exec.scenario.iterationInTest;
  const doc = cpf(n);
  const t0 = Date.now();
  const reg = http.post(`${BASE}/auth/register`, JSON.stringify({
    name: `Pessoa Ponta ${n}`, email: `ponta${n}@carga.test`, cpf: doc, password: dados.senha,
  }), { ...headers(null, n), tags: { passo: "cadastro" }, timeout: "60s" });
  if (!passo("cadastro", reg, (r) => r.status === 201)) return;
  const token = reg.json("accessToken");

  const ev = http.get(`${BASE}/events/${dados.pontaId}`, { ...headers(token, n), tags: { passo: "evento" }, timeout: "60s" });
  if (!passo("evento", ev, (r) => r.status === 200)) return;

  const ord = http.post(`${BASE}/orders`, JSON.stringify({
    acceptTerms: true, eventId: dados.pontaId, batchId: dados.pontaBatch, holders: [{ name: `Pessoa Ponta ${n}`, cpf: doc }],
  }), { ...headers(token, n), tags: { passo: "reserva" }, timeout: "60s" });
  if (!passo("reserva", ord, (r) => r.status === 201)) return;

  const pay = http.post(`${BASE}/orders/${ord.json("id")}/simulate-payment`, null, { ...headers(token, n), tags: { passo: "pagamento" }, timeout: "60s" });
  if (!passo("pagamento", pay, (r) => r.status === 200 && r.json("status") === "paid")) return;

  const tk = http.get(`${BASE}/tickets`, { ...headers(token, n), tags: { passo: "ingressos" }, timeout: "60s" });
  if (!passo("ingressos", tk, (r) => r.status === 200 && r.json("0.qrPayload"))) return;
  const qr = tk.json("0.qrPayload");

  // Um dos 40 celulares da portaria lê o QR.
  const s = staffTokens[n % staffTokens.length];
  const scan = http.post(`${BASE}/checkin/scan`, JSON.stringify({ eventId: dados.pontaId, code: qr }),
    { ...headers(s, 900000 + (n % staffTokens.length)), tags: { passo: "portaria" }, timeout: "60s" });
  if (!passo("portaria", scan, (r) => r.status === 200 && r.json("ok") === true)) return;

  ok.add(1);
  tempoJornada.add(Date.now() - t0);
}
