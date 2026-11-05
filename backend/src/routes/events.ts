import { Router } from "express";
import { z } from "zod";
import { all } from "../db.ts";
import { findEvent, toEventDetail, toEventSummary, type EventRow } from "../domain/events.ts";
import { notFound } from "../lib/errors.ts";
import { parse } from "../lib/http.ts";

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

eventsRouter.get("/", (req, res) => {
  const f = parse(filters, req.query);
  const where = ["status = 'published'", "starts_at >= datetime('now', '-12 hours')"];
  const params: string[] = [];
  if (f.q) { where.push("(title LIKE ? OR city LIKE ? OR venue LIKE ?)"); params.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`); }
  if (f.city) { where.push("city = ?"); params.push(f.city); }
  if (f.category) { where.push("category = ?"); params.push(f.category); }
  if (f.date) { where.push("substr(starts_at, 1, 10) >= ?"); params.push(f.date); }
  if (f.featured === "true") where.push("featured = 1");
  let list = all<EventRow>(`SELECT * FROM events WHERE ${where.join(" AND ")} ORDER BY starts_at`, ...params).map(toEventSummary);
  if (f.maxPrice) list = list.filter((e) => e.priceFrom <= f.maxPrice!);
  if (f.onlyAvailable === "true") list = list.filter((e) => e.availability !== "soldout");
  res.json(list);
});

eventsRouter.get("/:id", (req, res) => {
  const e = findEvent(req.params.id);
  if (!e || e.status === "draft") throw notFound("Evento não encontrado");
  res.json(toEventDetail(e));
});
