// Teste LEVE e SÓ DE LEITURA na produção (bootickets.com.br): poucas pessoas, só páginas e lista de eventos.
// Nada de compra, cadastro ou escrita. Serve só para medir a latência real da Vercel.
import http from "k6/http";
import { sleep } from "k6";
import { pensar } from "./comum.js";

const SITE = __ENV.SITE || "https://bootickets.com.br";

export const options = {
  scenarios: { leitura: { executor: "constant-vus", vus: Number(__ENV.PESSOAS || 5), duration: __ENV.DURACAO || "60s" } },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max", "count"],
  thresholds: {
    "http_req_duration{pagina:inicial}": ["p(95)<2000"],
    "http_req_duration{pagina:evento}": ["p(95)<2000"],
    "http_req_duration{pagina:api_eventos}": ["p(95)<2000"],
    "http_req_duration{pagina:api_evento}": ["p(95)<2000"],
  },
  discardResponseBodies: true,
};

export function setup() {
  const r = http.get(`${SITE}/api/v1/events`, { responseType: "text" });
  const lista = r.status === 200 ? JSON.parse(r.body) : [];
  const e = lista[0];
  console.log(`produção: ${lista.length} eventos; testando ${e ? e.slug || e.id : "(nenhum)"}; x-vercel-id=${r.headers["X-Vercel-Id"]}`);
  return { slug: e ? e.slug || e.id : null };
}

export default function (d) {
  http.get(`${SITE}/`, { tags: { pagina: "inicial" } });
  http.get(`${SITE}/api/v1/events`, { tags: { pagina: "api_eventos" } });
  sleep(pensar(1, 3));
  if (d.slug) {
    http.get(`${SITE}/eventos/${d.slug}`, { tags: { pagina: "evento" } });
    http.get(`${SITE}/api/v1/events/${d.slug}`, { tags: { pagina: "api_evento" } });
  }
  sleep(pensar(2, 5));
}
