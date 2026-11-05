import { Router } from "express";
import { z } from "zod";
import { all } from "../db.ts";
import { eventCheckinStats, scanTicket } from "../domain/tickets.ts";
import { forbidden } from "../lib/errors.ts";
import { canScan, parse, rateLimit, requireAuth, user } from "../lib/http.ts";

export const checkinRouter = Router();
checkinRouter.use(requireAuth);

/** Eventos em que o usuário pode operar a portaria. */
checkinRouter.get("/events", (req, res) => {
  const a = user(req);
  const isAdmin = a.roles.includes("admin");
  res.json(all<{ id: string; title: string; starts_at: string; venue: string }>(
    `SELECT e.id, e.title, e.starts_at, e.venue FROM events e
     WHERE e.status = 'published' AND e.starts_at >= datetime('now', '-2 days')
       AND (? OR e.organizer_id = ? OR EXISTS (SELECT 1 FROM event_staff s WHERE s.event_id = e.id AND s.user_id = ?))
     ORDER BY e.starts_at`,
    isAdmin ? 1 : 0, a.id, a.id,
  ).map((e) => ({ id: e.id, title: e.title, startsAt: e.starts_at, venue: e.venue })));
});

checkinRouter.post(
  "/scan",
  rateLimit({ windowMs: 60_000, max: 240, key: (r) => `scan:${r.auth?.id}` }),
  (req, res) => {
    const { eventId, code } = parse(z.object({ eventId: z.string().min(1), code: z.string().min(1).max(500) }), req.body);
    const a = user(req);
    if (!canScan(a, eventId)) throw forbidden("Você não faz parte da equipe deste evento.");
    res.json(scanTicket(a.id, eventId, code));
  },
);

checkinRouter.get("/events/:id/stats", (req, res) => {
  if (!canScan(user(req), req.params.id)) throw forbidden();
  res.json(eventCheckinStats(req.params.id));
});
