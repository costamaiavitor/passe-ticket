import { Router } from "express";
import { z } from "zod";
import { all } from "../db.js";
import { findEvent, toEventDetail, toEventSummary, type EventRow } from "../domain/events.js";
import { expireStaleOrders } from "../domain/orders.js";
import { notFound } from "../lib/errors.js";
import { optionalAuth, parse } from "../lib/http.js";

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
  await expireStaleOrders();
  const where = ["status = 'published'", "starts_at >= ?"];
  const params: string[] = [hoursAgo(12)];
  if (f.q) { where.push("(title ILIKE ? OR city ILIKE ? OR venue ILIKE ?)"); params.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`); }
  if (f.city) { where.push("city = ?"); params.push(f.city); }
  if (f.category) { where.push("category = ?"); params.push(f.category); }
  if (f.date) { where.push("substr(starts_at, 1, 10) >= ?"); params.push(f.date); }
  if (f.featured === "true") where.push("featured = 1");
  const rows = await all<EventRow>(`SELECT * FROM events WHERE ${where.join(" AND ")} ORDER BY starts_at`, ...params);
  let list = await Promise.all(rows.map(toEventSummary));
  if (f.maxPrice) list = list.filter((e) => e.priceFrom <= f.maxPrice!);
  if (f.onlyAvailable === "true") list = list.filter((e) => e.availability !== "soldout");
  res.json(list);
});

eventsRouter.get("/:id", optionalAuth, async (req, res) => {
  await expireStaleOrders();
  const e = await findEvent(String(req.params.id));
  const isPublic = e && (e.status === "published" || e.status === "cancelled");
  const canPreview = e && req.auth && (req.auth.id === e.organizer_id || req.auth.roles.includes("admin"));
  if (!e || (!isPublic && !canPreview)) throw notFound("Evento não encontrado");
  res.json(await toEventDetail(e));
});
