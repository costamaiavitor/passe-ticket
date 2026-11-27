// Cenário B: corrida de compras. Todos os compradores (já logados) clicam em "comprar" ao mesmo tempo
// no mesmo lote (1.000 ingressos). Quem consegue reservar paga (Pix simulado).
// Ao mesmo tempo, outras pessoas ficam navegando, para ver se o site fica lento para elas.
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";
import { SharedArray } from "k6/data";
import exec from "k6/execution";
import { BASE, headers, pensar } from "./comum.js";

const setup = JSON.parse(open("./dados/setup.json"));
const compradores = new SharedArray("compradores", () => JSON.parse(open("./dados/compradores.json")));
const NAVEGANDO = Number(__ENV.NAVEGANDO || 200);

const reservou = new Counter("compra_reservou");
const pagou = new Counter("compra_pagou");
const esgotado = new Counter("compra_esgotado");
const outroErro = new Counter("compra_outro_erro");
const tempoReserva = new Trend("tempo_reserva", true);
const tempoCompraCompleta = new Trend("tempo_compra_completa", true);

export const options = {
  scenarios: {
    compradores: {
      executor: "per-vu-iterations", vus: compradores.length, iterations: 1, maxDuration: "5m", exec: "comprar", startTime: "10s",
    },
    navegando: { executor: "constant-vus", vus: NAVEGANDO, duration: "70s", exec: "navegar" },
  },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max", "count"],
  thresholds: {
    "http_req_duration{passo:reserva}": ["p(95)<5000"],
    "http_req_duration{passo:pagamento}": ["p(95)<5000"],
    "http_req_duration{pagina:evento}": ["p(95)<2000"],
    "http_req_duration{pagina:inicial}": ["p(95)<2000"],
    tempo_reserva: ["p(95)<5000"],
    tempo_compra_completa: ["p(95)<10000"],
  },
  setupTimeout: "60s",
};

export function comprar() {
  const i = exec.vu.idInTest - 1;
  const c = compradores[i % compradores.length];
  const n = 10 + i;
  const t0 = Date.now();
  const r = http.post(`${BASE}/orders`, JSON.stringify({
    acceptTerms: true, eventId: setup.corridaId, batchId: setup.corridaBatch, holders: [{ name: c.name, cpf: c.cpf }],
  }), { ...headers(c.token, n), tags: { passo: "reserva" }, timeout: "120s" });
  tempoReserva.add(Date.now() - t0);
  if (r.status === 201) {
    reservou.add(1);
    const id = r.json("id");
    const p = http.post(`${BASE}/orders/${id}/simulate-payment`, null, { ...headers(c.token, n), tags: { passo: "pagamento" }, timeout: "120s" });
    if (check(p, { "pago": (x) => x.status === 200 && x.json("status") === "paid" })) {
      pagou.add(1);
      tempoCompraCompleta.add(Date.now() - t0);
    } else outroErro.add(1, { motivo: `pagamento_${p.status}` });
  } else if (r.status === 409 && ["SOLD_OUT", "NOT_ENOUGH_STOCK"].includes(String(r.json("code")))) {
    esgotado.add(1);
  } else {
    outroErro.add(1, { motivo: `reserva_${r.status}` });
    console.warn(`reserva falhou: ${r.status} ${String(r.body).slice(0, 200)}`);
  }
}

export function navegar() {
  const n = 600000 + exec.vu.idInTest;
  http.get(`${BASE}/events`, { ...headers(null, n), tags: { pagina: "inicial" } });
  sleep(pensar(1, 3));
  http.get(`${BASE}/events/${setup.corridaId}`, { ...headers(null, n), tags: { pagina: "evento" } });
  sleep(pensar(2, 5));
}
