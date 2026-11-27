// Atalhos para preparar dados pela API (sem passar pela tela).
export const BASE = process.env.BASE_URL ?? "http://localhost:8080";

/** IP falso por "pessoa": o limite de 10 logins por minuto por IP não mistura os testes. */
export const fakeIp = () => `10.${rand(255)}.${rand(255)}.${1 + rand(250)}`;
const rand = (n: number) => Math.floor(Math.random() * n);

/** CPF válido aleatório. */
export function cpf() {
  const d = Array.from({ length: 9 }, () => rand(10));
  if (new Set(d).size === 1) d[0] = (d[0]! + 1) % 10;
  for (const n of [9, 10]) { let s = 0; for (let i = 0; i < n; i++) s += d[i]! * (n + 1 - i); d.push((s * 10) % 11 % 10); }
  return d.join("");
}
export const fmtCpf = (c: string) => c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; token?: string; ip?: string } = {}) {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json", "x-forwarded-for": opts.ip ?? fakeIp(),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : null,
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body: body as T };
}

export async function login(email: string, password: string) {
  const r = await api<{ accessToken: string }>("/auth/login", { body: { email, password } });
  if (r.status !== 200) throw new Error(`login ${email}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.accessToken;
}

let seq = 0;
/** Cria um comprador novo (e-mail e CPF únicos) e devolve token e dados. */
export async function newBuyer(prefix = "qa") {
  const c = cpf();
  const email = `${prefix}-${Date.now()}-${process.pid}-${seq++}-${rand(1e6)}@teste.dev`;
  const password = "senhaqa1234";
  const name = `Comprador ${["Ana", "Bia", "Caio", "Davi", "Eva"][rand(5)]} Teste`;
  const r = await api<{ accessToken: string; user: { id: string } }>("/auth/register", { body: { name, email, cpf: c, password } });
  if (r.status !== 201) throw new Error(`cadastro: ${r.status} ${JSON.stringify(r.body)}`);
  return { token: r.body.accessToken, id: r.body.user.id, email, password, cpf: c, name };
}

/** Compra e paga (simulado) direto pela API. */
export async function buyPaid(token: string, eventId: string, batchId: string, holders: { name: string; cpf: string }[]) {
  const o = await api<{ id: string }>("/orders", { token, body: { eventId, items: [{ batchId, holders }], acceptTerms: true } });
  if (o.status !== 201) throw new Error(`pedido: ${o.status} ${JSON.stringify(o.body)}`);
  const p = await api(`/orders/${o.body.id}/simulate-payment`, { method: "POST", token });
  if (p.status !== 200) throw new Error(`pagamento: ${p.status} ${JSON.stringify(p.body)}`);
  return o.body.id;
}

export interface QaState {
  main: { id: string; title: string; pista: string; meia: string; camarote: string; pistaPrice: number };
  soldOut: { id: string; title: string };
  priv: { id: string; title: string; code: string };
  longName: { id: string; title: string };
  free: { id: string; title: string; batch: string };
  few: { id: string; title: string; batch: string };
}
