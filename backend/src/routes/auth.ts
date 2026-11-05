import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { config } from "../config.ts";
import { now, one, run } from "../db.ts";
import { isValidCpf, onlyDigits } from "../lib/cpf.ts";
import { hashPassword, randomToken, sha256, signAccessToken, verifyPassword } from "../lib/crypto.ts";
import { badRequest, conflict, HttpError, unauthorized } from "../lib/errors.ts";
import { parse, rateLimit, requireAuth, user, type Role } from "../lib/http.ts";

export const authRouter = Router();

interface UserRow { id: string; name: string; email: string; cpf: string; password_hash: string; roles: string }

const COOKIE = "pt_refresh";
const cookieOpts = () => ({
  httpOnly: true,
  secure: config.isProd,
  sameSite: (config.isProd ? "none" : "lax") as "none" | "lax",
  path: "/api/v1/auth",
  maxAge: config.refreshTokenTtlSec * 1000,
});

export function rolesOf(u: Pick<UserRow, "roles" | "email" | "id">): Role[] {
  const roles = new Set(JSON.parse(u.roles) as Role[]);
  if (config.adminEmails.includes(u.email) && !roles.has("admin")) {
    roles.add("admin");
    run("UPDATE users SET roles = ? WHERE id = ?", JSON.stringify([...roles]), u.id);
  }
  return [...roles];
}

export const publicUser = (u: UserRow) => ({ id: u.id, name: u.name, email: u.email, roles: rolesOf(u) });

function issueSession(res: Response, u: UserRow) {
  const refresh = randomToken();
  run(
    "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?,?,?,?)",
    randomUUID(), u.id, sha256(refresh), new Date(Date.now() + config.refreshTokenTtlSec * 1000).toISOString(),
  );
  res.cookie(COOKIE, refresh, cookieOpts());
  const pu = publicUser(u);
  // refreshToken também no corpo para apps nativos / clientes sem cookie.
  return { accessToken: signAccessToken(u.id, pu.roles), refreshToken: refresh, user: pu };
}

const readCookie = (req: Request, name: string) =>
  (req.headers.cookie ?? "").split(";").map((c) => c.trim().split("=")).find(([k]) => k === name)?.[1];

const limiter = rateLimit({ windowMs: 60_000, max: 10, key: (req) => `auth:${req.ip}` });

const registerSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email(),
  cpf: z.string().transform(onlyDigits).refine(isValidCpf, "CPF inválido"),
  password: z.string().min(8).max(200),
});

authRouter.post("/register", limiter, async (req, res) => {
  const data = parse(registerSchema, req.body);
  if (one("SELECT 1 FROM users WHERE email = ?", data.email)) throw conflict("EMAIL_TAKEN", "Já existe uma conta com esse e-mail.");
  const id = randomUUID();
  run(
    "INSERT INTO users (id, name, email, cpf, password_hash, roles, created_at) VALUES (?,?,?,?,?,?,?)",
    id, data.name, data.email, data.cpf, await hashPassword(data.password), JSON.stringify(["buyer"]), now(),
  );
  res.status(201).json(issueSession(res, one<UserRow>("SELECT * FROM users WHERE id = ?", id)!));
});

authRouter.post("/login", limiter, async (req, res) => {
  const { email, password } = parse(z.object({ email: z.string().trim().toLowerCase(), password: z.string() }), req.body);
  const u = one<UserRow>("SELECT * FROM users WHERE email = ?", email);
  if (!u || !(await verifyPassword(password, u.password_hash))) throw new HttpError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos.");
  res.json(issueSession(res, u));
});

/** Rotaciona o refresh token (cookie httpOnly ou corpo) e devolve novo access token. */
authRouter.post("/refresh", (req, res) => {
  const token = readCookie(req, COOKIE) ?? (typeof req.body?.refreshToken === "string" ? req.body.refreshToken : undefined);
  if (!token) throw unauthorized("Sessão expirada.");
  const row = one<{ id: string; user_id: string; expires_at: string; revoked_at: string | null }>(
    "SELECT * FROM refresh_tokens WHERE token_hash = ?", sha256(token),
  );
  if (!row || row.revoked_at || row.expires_at < now()) {
    // Reuso de token revogado = possível roubo: derruba todas as sessões.
    if (row?.revoked_at) run("UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL", now(), row.user_id);
    res.clearCookie(COOKIE, { ...cookieOpts(), maxAge: undefined });
    throw unauthorized("Sessão expirada.");
  }
  run("UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?", now(), row.id);
  res.json(issueSession(res, one<UserRow>("SELECT * FROM users WHERE id = ?", row.user_id)!));
});

authRouter.post("/logout", (req, res) => {
  const token = readCookie(req, COOKIE) ?? req.body?.refreshToken;
  if (typeof token === "string") run("UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ?", now(), sha256(token));
  res.clearCookie(COOKIE, { ...cookieOpts(), maxAge: undefined });
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (req, res) => {
  const u = one<UserRow>("SELECT * FROM users WHERE id = ?", user(req).id);
  if (!u) throw unauthorized();
  res.json(publicUser(u));
});

/** Qualquer usuário pode virar produtor e criar eventos (como nas plataformas de ingresso). */
authRouter.post("/become-organizer", requireAuth, (req, res) => {
  const u = one<UserRow>("SELECT * FROM users WHERE id = ?", user(req).id);
  if (!u) throw unauthorized();
  const roles = new Set(rolesOf(u));
  if (roles.has("organizer")) throw badRequest("ALREADY_ORGANIZER", "Você já é produtor.");
  roles.add("organizer");
  run("UPDATE users SET roles = ? WHERE id = ?", JSON.stringify([...roles]), u.id);
  res.json(issueSession(res, { ...u, roles: JSON.stringify([...roles]) }));
});
