// Cenário A: pessoas navegando (lista de eventos da página inicial + página do evento).
// Cada pessoa: abre a página inicial, lê 1–3 s, abre o evento, lê 2–5 s, e repete.
// Uso: k6 run -e PESSOAS=200 -e DURACAO=40s carga/navegacao.js
import http from "k6/http";
import { check, sleep } from "k6";
import { BASE, headers, pensar } from "./comum.js";

const setup = JSON.parse(open("./dados/setup.json"));
const PESSOAS = Number(__ENV.PESSOAS || 50);

export const options = {
  scenarios: {
    navegando: { executor: "constant-vus", vus: PESSOAS, duration: __ENV.DURACAO || "40s", gracefulStop: "10s" },
  },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max", "count"],
  thresholds: {
    "http_req_duration{pagina:inicial}": ["p(95)<2000"],
    "http_req_duration{pagina:evento}": ["p(95)<2000"],
    http_req_failed: ["rate<0.01"],
  },
  discardResponseBodies: true,
};

export default function () {
  const n = 500000 + __VU;
  const a = http.get(`${BASE}/events`, { ...headers(null, n), tags: { pagina: "inicial" } });
  check(a, { "inicial 200": (r) => r.status === 200 });
  sleep(pensar(1, 3));
  const b = http.get(`${BASE}/events/${setup.navSlug}`, { ...headers(null, n), tags: { pagina: "evento" } });
  check(b, { "evento 200": (r) => r.status === 200 });
  sleep(pensar(2, 5));
}
