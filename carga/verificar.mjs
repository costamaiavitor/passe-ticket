// Confere no banco, depois da corrida, se o estoque e os ingressos estão certos.
// Uso: node carga/verificar.mjs <DATABASE_URL> <eventId> <arquivo-saida>
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";

const require = createRequire(new URL("../backend/package.json", import.meta.url));
const pg = require("pg");
const [url, eventIdArg, out] = process.argv.slice(2);
const setup = JSON.parse(readFileSync("carga/dados/setup.json", "utf8"));
const eventId = eventIdArg || setup.corridaId;
const c = new pg.Client({ connectionString: url });
await c.connect();
const q = async (sql, p = []) => (await c.query(sql, p)).rows;

const [lote] = await q("SELECT total, sold, reserved FROM batches WHERE event_id = $1", [eventId]);
const ingressos = await q("SELECT status, COUNT(*)::int n FROM tickets WHERE event_id = $1 GROUP BY status", [eventId]);
const pedidos = await q("SELECT status, COUNT(*)::int n FROM orders WHERE event_id = $1 GROUP BY status", [eventId]);
const [dupCpf] = await q(`SELECT COUNT(*)::int n FROM (SELECT holder_cpf FROM tickets WHERE event_id = $1 AND status IN ('valid','used','pending')
  GROUP BY holder_cpf HAVING COUNT(*) > (SELECT max_per_cpf FROM events WHERE id = $1)) x`, [eventId]);
const [cpfRepetido] = await q(`SELECT COUNT(*)::int n FROM (SELECT holder_cpf FROM tickets WHERE event_id = $1 AND status IN ('valid','used','pending')
  GROUP BY holder_cpf HAVING COUNT(*) > 1) x`, [eventId]);
const [dupId] = await q("SELECT COUNT(*) - COUNT(DISTINCT id) AS n FROM tickets WHERE event_id = $1", [eventId]);
const [pagosSemIngresso] = await q(`SELECT COUNT(*)::int n FROM orders o WHERE o.event_id = $1 AND o.status = 'paid'
  AND (SELECT COUNT(*) FROM tickets t WHERE t.order_id = o.id AND t.status = 'valid') <> o.quantity`, [eventId]);
const [tempo] = await q(`SELECT MIN(created_at) primeiro, MAX(created_at) ultimo, MAX(paid_at) ultimo_pago, COUNT(*)::int n
  FROM orders WHERE event_id = $1`, [eventId]);
await c.end();

const validos = ingressos.filter((i) => ["valid", "used"].includes(i.status)).reduce((s, i) => s + i.n, 0);
const seg = (new Date(tempo.ultimo) - new Date(tempo.primeiro)) / 1000;
const segPago = (new Date(tempo.ultimo_pago) - new Date(tempo.primeiro)) / 1000;
const r = {
  lote, ingressos, pedidos,
  ingressosValidos: validos,
  vendeuMaisQueEstoque: validos > lote.total || lote.sold + lote.reserved > lote.total,
  cpfsAcimaDoLimite: dupCpf.n,
  cpfsComMaisDeUmIngresso: cpfRepetido.n,
  idsDuplicados: Number(dupId.n),
  pedidosPagosComIngressoErrado: pagosSemIngresso.n,
  segundosDoPrimeiroAoUltimoPedido: seg,
  reservasPorSegundo: +(tempo.n / Math.max(seg, 0.001)).toFixed(1),
  segundosAteUltimoPagamento: segPago,
  vendasConcluidasPorSegundo: +(validos / Math.max(segPago, 0.001)).toFixed(1),
};
r.ok = !r.vendeuMaisQueEstoque && r.cpfsAcimaDoLimite === 0 && r.idsDuplicados === 0 && r.pedidosPagosComIngressoErrado === 0;
writeFileSync(out || "carga/resultados/verificacao-corrida.json", JSON.stringify(r, null, 2));
console.log(JSON.stringify(r, null, 2));
if (!r.ok) process.exitCode = 1;
