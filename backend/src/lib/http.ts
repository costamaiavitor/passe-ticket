import type { NextFunction, Request, Response } from "express";
import type { z, ZodTypeAny } from "zod";
import { one } from "../db.ts";
import { verifyAccessToken } from "./crypto.ts";
import { badRequest, forbidden, HttpError, unauthorized } from "./errors.ts";

export type Role = "buyer" | "organizer" | "staff" | "admin";
export interface AuthCtx { id: string; roles: Role[] }

declare module "express-serve-static-core" {
  interface Request { auth?: AuthCtx }
}

export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const first = r.error.issues[0];
    throw badRequest("VALIDATION", first ? `${first.path.join(".") || "dados"}: ${first.message}` : "Dados inválidos", r.error.flatten());
  }
  return r.data;
}

/** Lê o Bearer token se existir (não exige login). */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ")) {
    const c = verifyAccessToken(h.slice(7));
    if (c) req.auth = { id: c.sub, roles: c.roles as Role[] };
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  optionalAuth(req, res, () => {
    if (!req.auth) return next(unauthorized());
    next();
  });
}

export const requireRole = (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) =>
  requireAuth(req, res, (err?: unknown) => {
    if (err) return next(err);
    if (!req.auth!.roles.some((r) => roles.includes(r) || r === "admin")) return next(forbidden());
    next();
  });

export const user = (req: Request): AuthCtx => {
  if (!req.auth) throw unauthorized();
  return req.auth;
};

/** Organizador dono do evento ou admin. */
export function assertEventOwner(auth: AuthCtx, eventId: string) {
  const ev = one<{ organizer_id: string }>("SELECT organizer_id FROM events WHERE id = ?", eventId);
  if (!ev) throw new HttpError(404, "NOT_FOUND", "Evento não encontrado.");
  if (ev.organizer_id !== auth.id && !auth.roles.includes("admin")) throw forbidden();
}

/** Pode operar a portaria: equipe do evento, organizador dono ou admin. */
export function canScan(auth: AuthCtx, eventId: string): boolean {
  if (auth.roles.includes("admin")) return true;
  return !!one(
    `SELECT 1 FROM events e WHERE e.id = ? AND (e.organizer_id = ? OR EXISTS
       (SELECT 1 FROM event_staff s WHERE s.event_id = e.id AND s.user_id = ?))`,
    eventId, auth.id, auth.id,
  );
}

/** Limitador simples em memória (por processo). */
export function rateLimit(opts: { windowMs: number; max: number; key: (req: Request) => string }) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const k = opts.key(req);
    const t = Date.now();
    let h = hits.get(k);
    if (!h || h.reset < t) {
      h = { n: 0, reset: t + opts.windowMs };
      hits.set(k, h);
      if (hits.size > 10_000) for (const [key, v] of hits) if (v.reset < t) hits.delete(key);
    }
    if (++h.n > opts.max) {
      res.setHeader("Retry-After", Math.ceil((h.reset - t) / 1000));
      return next(new HttpError(429, "RATE_LIMITED", "Muitas tentativas. Aguarde um pouco."));
    }
    next();
  };
}
