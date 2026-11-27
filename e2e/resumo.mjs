// Transforma o resultado do Playwright num resumo em português: o que falhou, em quais aparelhos e por quê.
import { readFileSync, writeFileSync } from "node:fs";

const r = JSON.parse(readFileSync(new URL("./resultados/resultados.json", import.meta.url), "utf8"));
const rows = [];
function walk(suite, file) {
  for (const s of suite.suites ?? []) walk(s, s.file ?? file);
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests) {
      const res = t.results.at(-1) ?? {};
      const errors = (res.errors ?? []).map((e) => (e.message ?? "").replace(/\u001b\[[0-9;]*m/g, "").split("\n").filter(Boolean).slice(0, 6).join(" ⏎ "));
      const notes = (t.annotations ?? []).map((a) => `${a.type}: ${a.description}`);
      rows.push({ file: spec.file ?? file, title: spec.title, project: t.projectName, status: t.status === "expected" ? "ok" : t.status === "skipped" ? "pulado" : "FALHOU", errors, notes, ms: res.duration ?? 0 });
    }
  }
}
for (const s of r.suites) walk(s, s.file);

const total = rows.length, ok = rows.filter((x) => x.status === "ok").length, fail = rows.filter((x) => x.status === "FALHOU").length;
const skip = rows.filter((x) => x.status === "pulado").length;
const byTest = new Map();
for (const x of rows.filter((x) => x.status === "FALHOU")) {
  const k = `${x.file} › ${x.title}`;
  if (!byTest.has(k)) byTest.set(k, []);
  byTest.get(k).push(x);
}
let md = `# Resultado da caça a bugs\n\n${total} execuções (testes × aparelhos): **${ok} ok**, **${fail} com problema**, ${skip} puladas.\n\n`;
md += `## Problemas por teste\n\n`;
for (const [k, xs] of byTest) {
  md += `### ${k}\nAparelhos: ${xs.map((x) => x.project).join(", ")}\n\n`;
  const uniq = [...new Set(xs.flatMap((x) => x.errors))];
  for (const e of uniq.slice(0, 6)) md += `- ${e.slice(0, 900)}\n`;
  md += `\n`;
}
const notes = rows.filter((x) => x.notes.length);
if (notes.length) { md += `## Medições\n\n`; for (const x of notes) md += `- ${x.title} (${x.project}): ${x.notes.join("; ")}\n`; }
md += `\n## Todas as execuções\n\n| Teste | Aparelho | Resultado | Tempo |\n|---|---|---|---|\n`;
for (const x of rows) md += `| ${x.title} | ${x.project} | ${x.status} | ${(x.ms / 1000).toFixed(1)} s |\n`;
writeFileSync(new URL("./resultados/RESUMO.md", import.meta.url), md);
console.log(`${total} execuções, ${ok} ok, ${fail} com problema, ${skip} puladas`);
