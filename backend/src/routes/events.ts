import { Router } from "express";
import { z } from "zod";
import { all, one } from "../db.js";
import { config } from "../config.js";
import { findEvent, normalizeCode, toEventDetail, toEventSummaries, type EventRow } from "../domain/events.js";
import { expireStaleOrdersThrottled } from "../domain/orders.js";
import { findUsableCoupon } from "../domain/promos.js";
import { HttpError, notFound } from "../lib/errors.js";
import { optionalAuth, parse, rateLimit } from "../lib/http.js";

export const eventsRouter = Router();

const filters = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  category: z.enum(["shows", "festas", "conferencias", "teatro", "esportes"]).optional(),
  date: z.string().optional(),
  maxPrice: z.coerce.number().optional(),
  onlyAvailable: z.enum(["true", "false"]).optional(),
  featured: z.enum(["true", "false"]).optional(),
});

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

eventsRouter.get("/", async (req, res) => {
  const f = parse(filters, req.query);
  // Sem processo rodando em segundo plano na Vercel: reservas vencidas são liberadas aqui.
  await expireStaleOrdersThrottled();
  // Eventos privados não aparecem na lista nem na busca: só quem tem o link chega neles.
  const where = ["status = 'published'", "visibility = 'public'", "starts_at >= ?"];
  const params: string[] = [hoursAgo(12)];
  if (f.q) { where.push("(title ILIKE ? OR city ILIKE ? OR venue ILIKE ?)"); params.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`); }
  if (f.city) { where.push("city = ?"); params.push(f.city); }
  if (f.category) { where.push("category = ?"); params.push(f.category); }
  if (f.date) { where.push("substr(starts_at, 1, 10) >= ?"); params.push(f.date); }
  if (f.featured === "true") where.push("featured = 1");
  const rows = await all<EventRow>(`SELECT * FROM events WHERE ${where.join(" AND ")} ORDER BY starts_at`, ...params);
  let list = await toEventSummaries(rows);
  if (f.maxPrice) list = list.filter((e) => e.priceFrom <= f.maxPrice!);
  if (f.onlyAvailable === "true") list = list.filter((e) => e.availability !== "soldout");
  res.json(list);
});

// Poucas tentativas por minuto: impede descobrir a palavra-senha ou cupons na base do chute.
const guessLimit = (name: string) =>
  rateLimit({ windowMs: 60_000, max: config.isTest ? 1000 : 10, key: (r) => `${name}:${r.ip}:${String(r.params.id)}` });

async function publicEvent(idOrSlug: string) {
  const e = await findEvent(idOrSlug);
  if (!e || e.status !== "published") throw notFound("Evento não encontrado");
  return e;
}

/** Confere a palavra-senha antes de liberar a compra (a compra confere de novo no servidor). */
eventsRouter.post("/:id/access-code", guessLimit("code"), async (req, res) => {
  const e = await publicEvent(String(req.params.id));
  const { code } = parse(z.object({ code: z.string().max(60) }), req.body);
  if (e.access_code && normalizeCode(code) !== normalizeCode(e.access_code))
    throw new HttpError(403, "ACCESS_CODE", "Palavra-senha incorreta. Peça a senha para o organizador do evento.");
  res.json({ ok: true });
});

/** Prévia do cupom (mostra o desconto antes de ir para o pagamento). */
eventsRouter.post("/:id/coupon", guessLimit("coupon"), async (req, res) => {
  const e = await publicEvent(String(req.params.id));
  const { code, quantity } = parse(z.object({ code: z.string().min(1).max(40), quantity: z.number().int().min(1).max(20).default(1) }), req.body);
  const c = await findUsableCoupon(e.id, code, quantity);
  res.json({ code: c.code, kind: c.kind, value: c.value });
});

eventsRouter.get("/:id", optionalAuth, async (req, res) => {
  await expireStaleOrdersThrottled();
  const e = await findEvent(String(req.params.id));
  const isPublic = e && (e.status === "published" || e.status === "cancelled");
  const canPreview = e && req.auth && (req.auth.id === e.organizer_id || req.auth.roles.includes("admin")
    || !!(await one("SELECT 1 FROM event_organizers WHERE event_id = ? AND user_id = ?", e.id, req.auth.id)));
  if (!e || (!isPublic && !canPreview)) throw notFound("Evento não encontrado");
  res.json(await toEventDetail(e));
});
