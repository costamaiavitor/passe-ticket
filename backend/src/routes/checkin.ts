import { Router } from "express";
import { z } from "zod";
import { all } from "../db.js";
import { eventCheckinStats, scanTicket } from "../domain/tickets.js";
import { forbidden } from "../lib/errors.js";
import { canScan, parse, rateLimit, requireAuth, user } from "../lib/http.js";

export const checkinRouter = Router();
checkinRouter.use(requireAuth);

/** Eventos em que o usuário pode operar a portaria. */
checkinRouter.get("/events", async (req, res) => {
  const a = user(req);
  const isAdmin = a.roles.includes("admin");
  const since = new Date(Date.now() - 2 * 86400_000).toISOString();
  const rows = await all<{ id: string; title: string; starts_at: string; venue: string }>(
    `SELECT e.id, e.title, e.starts_at, e.venue FROM events e
     WHERE e.status = 'published' AND e.starts_at >= ?
       AND (?::boolean OR e.organizer_id = ? OR EXISTS (SELECT 1 FROM event_staff s WHERE s.event_id = e.id AND s.user_id = ?)
            OR EXISTS (SELECT 1 FROM event_organizers c WHERE c.event_id = e.id AND c.user_id = ?))
     ORDER BY e.starts_at`,
    since, isAdmin, a.id, a.id, a.id,
  );
  res.json(rows.map((e) => ({ id: e.id, title: e.title, startsAt: e.starts_at, venue: e.venue })));
});

checkinRouter.post(
  "/scan",
  rateLimit({ windowMs: 60_000, max: 240, key: (r) => `scan:${r.auth?.id}` }),
  async (req, res) => {
    const { eventId, code } = parse(z.object({ eventId: z.string().min(1), code: z.string().min(1).max(500) }), req.body);
    const a = user(req);
    if (!(await canScan(a, eventId))) throw forbidden("Você não faz parte da equipe deste evento.");
    res.json(await scanTicket(a.id, eventId, code));
  },
);

checkinRouter.get("/events/:id/stats", async (req, res) => {
  if (!(await canScan(user(req), req.params.id))) throw forbidden();
  res.json(await eventCheckinStats(req.params.id));
});
