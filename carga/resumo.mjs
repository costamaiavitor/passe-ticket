// Junta os resultados do k6 numa tabela (carga/resultados/RESUMO.md) e imprime avisos no GitHub Actions.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const DIR = "carga/resultados";
const ler = (f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"));
const ms = (v) => (v == null ? "—" : v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`);
const pct = (v) => (v == null ? "—" : `${(v * 100).toFixed(2)}%`);
const m = (s, k) => s.metrics[k] ?? {};
const falhas = (s) => m(s, "http_req_failed").value ?? m(s, "http_req_failed").rate;
const linhas = ["# Resultado do teste de carga", ""];
const avisos = [];

// Cenário A
const nav = readdirSync(DIR).filter((f) => /^nav-\d+\.json$/.test(f)).map((f) => [Number(f.match(/\d+/)[0]), ler(f)]).sort((a, b) => a[0] - b[0]);
if (nav.length) {
  linhas.push("## A) Pessoas navegando (página inicial + página do evento)", "",
    "| Pessoas ao mesmo tempo | Pedidos/s na API | p95 página inicial | p95 página do evento | p99 geral | Erros | CPU da API (máx) |",
    "|---|---|---|---|---|---|---|");
  for (const [p, s] of nav) {
    const cpu = existsSync(`${DIR}/cpu-nav-${p}.txt`) ? Math.max(0, ...readFileSync(`${DIR}/cpu-nav-${p}.txt`, "utf8").split("\n").map((l) => Number(l.trim().split(/\s+/)[0]) || 0)) : null;
    linhas.push(`| ${p} | ${(m(s, "http_reqs").rate ?? 0).toFixed(0)} | ${ms(m(s, "http_req_duration{pagina:inicial}")["p(95)"])} | ${ms(m(s, "http_req_duration{pagina:evento}")["p(95)"])} | ${ms(m(s, "http_req_duration")["p(99)"])} | ${pct(falhas(s))} | ${cpu == null ? "—" : cpu + "%"} |`);
  }
  const bom = nav.filter(([, s]) => (m(s, "http_req_duration")["p(95)"] ?? 1e9) < 2000 && (falhas(s) ?? 0) < 0.01).map(([p]) => p);
  avisos.push(`Navegação: aguentou até ${bom.length ? Math.max(...bom) : 0} pessoas com p95 < 2 s e < 1% de erro.`);
  linhas.push("");
}

// Cenário B
if (existsSync(`${DIR}/corrida.json`)) {
  const s = ler("corrida.json");
  const c = (k) => m(s, k).count ?? 0;
  linhas.push("## B) Corrida de compras (todos clicam em comprar ao mesmo tempo)", "",
    `- Reservaram: **${c("compra_reservou")}**, pagaram: **${c("compra_pagou")}**, receberam "esgotado": **${c("compra_esgotado")}**, outros erros: **${c("compra_outro_erro")}**`,
    `- Tempo para reservar: mediana ${ms(m(s, "tempo_reserva").med)}, p95 ${ms(m(s, "tempo_reserva")["p(95)"])}, máximo ${ms(m(s, "tempo_reserva").max)}`,
    `- Tempo da compra completa (reserva + pagamento): mediana ${ms(m(s, "tempo_compra_completa").med)}, p95 ${ms(m(s, "tempo_compra_completa")["p(95)"])}`,
    `- Quem só estava navegando durante a corrida: p95 página inicial ${ms(m(s, "http_req_duration{pagina:inicial}")["p(95)"])}, p95 página do evento ${ms(m(s, "http_req_duration{pagina:evento}")["p(95)"])}`, "");
  avisos.push(`Corrida: ${c("compra_pagou")} pagos, ${c("compra_esgotado")} esgotado, ${c("compra_outro_erro")} erros; reserva p95 ${ms(m(s, "tempo_reserva")["p(95)"])}.`);
}
if (existsSync(`${DIR}/verificacao-corrida.json`)) {
  const v = ler("verificacao-corrida.json");
  linhas.push("### Conferência no banco", "", "```json", JSON.stringify(v, null, 2), "```", "");
  avisos.push(`Conferência: ${v.ok ? "OK" : "PROBLEMA"} — ${v.ingressosValidos}/${v.lote.total} vendidos, ${v.reservasPorSegundo} reservas/s, ${v.vendasConcluidasPorSegundo} vendas concluídas/s, CPFs acima do limite ${v.cpfsAcimaDoLimite}, CPFs com 2 ingressos ${v.cpfsComMaisDeUmIngresso}.`);
}

// Cenário C
const ponta = readdirSync(DIR).filter((f) => /^ponta-\d+\.json$/.test(f)).map((f) => [Number(f.match(/\d+/)[0]), ler(f)]).sort((a, b) => a[0] - b[0]);
if (ponta.length) {
  linhas.push("## C) Jornada completa (cadastro → compra → pagamento → QR → portaria)", "",
    "| Pessoas novas por segundo | Por minuto | Jornadas OK | Falhas | p95 jornada | p95 cadastro | p95 compra | p95 pagamento | p95 portaria | CPU da API (máx) |",
    "|---|---|---|---|---|---|---|---|---|---|");
  for (const [r, s] of ponta) {
    const p95 = (k) => ms(m(s, `http_req_duration{passo:${k}}`)["p(95)"]);
    const cpu = existsSync(`${DIR}/cpu-ponta-${r}.txt`) ? Math.max(0, ...readFileSync(`${DIR}/cpu-ponta-${r}.txt`, "utf8").split("\n").map((l) => Number(l.trim().split(/\s+/)[0]) || 0)) : null;
    linhas.push(`| ${r} | ${r * 60} | ${m(s, "jornada_ok").count ?? 0} | ${m(s, "jornada_falhou").count ?? 0} | ${ms(m(s, "tempo_jornada")["p(95)"])} | ${p95("cadastro")} | ${p95("reserva")} | ${p95("pagamento")} | ${p95("portaria")} | ${cpu == null ? "—" : cpu + "%"} |`);
  }
  linhas.push("");
  const bons = ponta.filter(([, s]) => (m(s, "tempo_jornada")["p(95)"] ?? 1e9) < 10000 && (m(s, "jornada_falhou").count ?? 0) <= (m(s, "jornada_ok").count ?? 0) * 0.01).map(([r]) => r);
  avisos.push(`Ponta a ponta: até ${bons.length ? Math.max(...bons) : 0} pessoas novas/s (${(bons.length ? Math.max(...bons) : 0) * 60}/min) com jornada p95 < 10 s.`);
}
if (existsSync(`${DIR}/preparo.json`)) {
  const p = ler("preparo.json");
  linhas.push("## Cadastro em massa (preparo)", "", `- ${p.compradores} contas em ${p.cadastroSegundos.toFixed(1)} s → **${p.cadastrosPorSegundo} cadastros/s**`, "");
  avisos.push(`Cadastro em massa: ${p.cadastrosPorSegundo} cadastros/s.`);
}
for (const f of readdirSync(DIR).filter((f) => f.startsWith("pg-"))) {
  linhas.push(`### Conexões no Postgres durante ${f.replace(/^pg-|\.txt$/g, "")} (amostras)`, "", "```", readFileSync(`${DIR}/${f}`, "utf8").split("\n").slice(0, 60).join("\n"), "```", "");
}
writeFileSync(`${DIR}/RESUMO.md`, linhas.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, linhas.join("\n"), { flag: "a" });
for (const a of avisos) console.log(`::notice title=Carga::${a}`);
console.log(linhas.join("\n"));
