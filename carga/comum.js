// Funções usadas pelos scripts do k6.
export const BASE = (__ENV.BASE || "http://127.0.0.1:3333") + "/api/v1";

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

/** Cada pessoa simulada vem de um IP diferente (como celulares diferentes). */
export const ip = (n) => `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`;

export function headers(token, n) {
  const h = { "Content-Type": "application/json", "X-Forwarded-For": ip(n) };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return { headers: h };
}

/** Pausa de quem está lendo a página (entre min e max segundos). */
export const pensar = (min, max) => min + Math.random() * (max - min);

export const SUMMARY_STATS = ["avg", "med", "p(90)", "p(95)", "p(99)", "max", "count"];
