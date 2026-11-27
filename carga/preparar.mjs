// Prepara os dados do teste de carga (roda só no GitHub Actions, contra a API local com Postgres de teste).
// Cria: admin/organizador, eventos aprovados, equipe da portaria e os compradores da corrida.
// Uso: node carga/preparar.mjs <API_BASE> <N_COMPRADORES>
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = (process.argv[2] ?? "http://127.0.0.1:3333") + "/api/v1";
const N = Number(process.argv[3] ?? 2000);
const SENHA = "senha-de-carga-123";
const OUT = "carga/dados";
mkdirSync(OUT, { recursive: true });

/** CPF válido a partir de um número (base de 9 dígitos + dígitos verificadores). */
export function cpf(n) {
  const base = String(100000000 + n).padStart(9, "0").slice(-9);
  const d = (s, len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(s[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = d(base, 9);
  return base + d1 + d(base + d1, 10);
}
// Cada "pessoa" vem de um IP diferente (a API confia no 1º proxy, como atrás da Vercel).
const ip = (n) => `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`;

async function api(path, { body, token, method, n = 0 } = {}) {
  const res = await fetch(BASE + path, {
    method: method ?? (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": ip(n),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${path} → ${res.status} ${text.slice(0, 300)}`);
  return data;
}

const register = (n, prefix) => api("/auth/register", {
  n, body: { name: `Pessoa ${prefix} ${n}`, email: `${prefix}${n}@carga.test`, cpf: cpf(n), password: SENHA },
});

/** Executa fn para 0..count-1 com no máximo `conc` ao mesmo tempo. */
async function pool(count, conc, fn) {
  const out = new Array(count);
  let next = 0;
  await Promise.all(Array.from({ length: conc }, async () => {
    while (next < count) { const i = next++; out[i] = await fn(i); }
  }));
  return out;
}

const t0 = Date.now();
// 1) Admin (está em ADMIN_EMAILS) que também é organizador.
const adm = await register(1, "admin");
const org = await api("/auth/become-organizer", { token: adm.accessToken, body: { acceptOrganizerTerms: true }, n: 1 });
const tok = org.accessToken;

const future = new Date(Date.now() + 10 * 86400_000).toISOString();
const start = new Date(Date.now() - 60_000).toISOString();
const descricao = "Festa de teste de carga. ".repeat(20);
async function evento(title, lotes) {
  const e = await api("/organizer/events", {
    token: tok, n: 1, body: {
      acceptOrganizerTerms: true, title, category: "festas", startsAt: future, venue: "Galpão do Teste",
      city: "Fortaleza", address: "Rua do Teste, 100", description: descricao,
      batches: lotes.map((l) => ({ ...l, salesStart: start, salesEnd: future })),
    },
  });
  await api(`/admin/events/${e.id}/approve`, { method: "POST", token: tok, n: 1 });
  return api(`/events/${e.id}`);
}

// 2) Eventos: um para navegar (com mais 9 na lista, como uma vitrine real), um para a corrida e um para o ponta a ponta.
const nav = await evento("Festa Navegação", [
  { name: "1º lote", price: 5000, total: 500 }, { name: "2º lote", price: 7000, total: 500 }, { name: "Camarote", price: 15000, total: 100 },
]);
for (let i = 2; i <= 10; i++) await evento(`Festa Vitrine ${i}`, [{ name: "Pista", price: 4000 + i * 100, total: 300 }]);
const corrida = await evento("Festa Corrida", [{ name: "Lote único", price: 8000, total: 1000 }]);
const ponta = await evento("Festa Ponta a Ponta", [{ name: "Pista", price: 6000, total: 200000 }]);

// 3) Equipe da portaria (40 celulares lendo QR; cada um pode ler até 240 por minuto).
const staff = await pool(40, 10, async (i) => {
  const s = await register(900000 + i, "portaria");
  await api(`/organizer/events/${ponta.id}/staff`, { token: tok, n: 1, body: { email: `portaria${900000 + i}@carga.test` } });
  return s.user.email;
});
// Login de novo depois de entrar na equipe (o papel "staff" vai no token).
const staffTokens = await pool(staff.length, 10, async (i) =>
  (await api("/auth/login", { n: 900000 + i, body: { email: staff[i], password: SENHA } })).accessToken);

// 4) Compradores da corrida (já cadastrados e logados, prontos para clicar em "comprar").
const tc = Date.now();
const buyers = await pool(N, 40, async (i) => {
  const n = 10 + i;
  const r = await register(n, "comprador");
  return { token: r.accessToken, name: r.user.name, cpf: cpf(n), ip: ip(n) };
});
const cadastroSeg = (Date.now() - tc) / 1000;

writeFileSync(`${OUT}/setup.json`, JSON.stringify({
  navId: nav.id, navSlug: nav.slug, corridaId: corrida.id, corridaBatch: corrida.batches[0].id,
  pontaId: ponta.id, pontaBatch: ponta.batches[0].id, staffTokens, staffEmails: staff, senha: SENHA,
}));
writeFileSync(`${OUT}/compradores.json`, JSON.stringify(buyers));
const info = { compradores: N, cadastroSegundos: cadastroSeg, cadastrosPorSegundo: +(N / cadastroSeg).toFixed(1), preparoSegundos: (Date.now() - t0) / 1000 };
mkdirSync("carga/resultados", { recursive: true });
writeFileSync("carga/resultados/preparo.json", JSON.stringify(info, null, 2));
console.log("Preparo ok:", info);
