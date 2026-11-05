import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { config } from "../config.ts";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64url");
  const key = await scryptAsync(password, Buffer.from(saltB64, "base64url"), expected.length);
  return timingSafeEqual(key, expected);
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("base64url");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// ---------- JWT (HS256) ----------
export interface AccessClaims { sub: string; roles: string[]; iat: number; exp: number }

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const hmac = (key: string, data: string) => createHmac("sha256", key).update(data).digest("base64url");

export function signAccessToken(sub: string, roles: string[]): string {
  const iat = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, roles, iat, exp: iat + config.accessTokenTtlSec })}`;
  return `${body}.${hmac(config.jwtSecret, body)}`;
}

export function verifyAccessToken(token: string): AccessClaims | null {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s || !safeEqual(hmac(config.jwtSecret, `${h}.${p}`), s)) return null;
  try {
    const claims = JSON.parse(Buffer.from(p, "base64url").toString()) as AccessClaims;
    return claims.exp > Date.now() / 1000 ? claims : null;
  } catch {
    return null;
  }
}

// ---------- QR Code do ingresso ----------
// Conteúdo do QR: PASSE1.<ticketId>.<versão>.<assinatura>
// A assinatura é um HMAC com segredo do servidor: não dá para forjar nem adivinhar um QR.
// A versão muda quando o ingresso é transferido, invalidando o QR antigo.
const QR_PREFIX = "PASSE1";

const qrSignature = (ticketId: string, version: number) =>
  hmac(config.qrSecret, `${ticketId}.${version}`).slice(0, 27);

export const buildQrPayload = (ticketId: string, version: number) =>
  `${QR_PREFIX}.${ticketId}.${version}.${qrSignature(ticketId, version)}`;

export function parseQrPayload(raw: string): { ticketId: string; version: number } | null {
  const parts = raw.trim().split(".");
  if (parts.length !== 4 || parts[0] !== QR_PREFIX) return null;
  const [, ticketId, v, sig] = parts as [string, string, string, string];
  const version = Number(v);
  if (!Number.isInteger(version) || version < 1) return null;
  return safeEqual(qrSignature(ticketId, version), sig) ? { ticketId, version } : null;
}
