import { Router } from "express";
import { z } from "zod";
import { getMyTicket, listMyTickets, transferTicket } from "../domain/tickets.ts";
import { parse, requireAuth, user } from "../lib/http.ts";

export const ticketsRouter = Router();
ticketsRouter.use(requireAuth);

ticketsRouter.get("/", (req, res) => { res.json(listMyTickets(user(req).id)); });
ticketsRouter.get("/:id", (req, res) => { res.json(getMyTicket(user(req).id, req.params.id)); });

ticketsRouter.post("/:id/transfer", (req, res) => {
  const body = parse(z.object({ email: z.string().email(), holderName: z.string().trim().min(3), holderCpf: z.string() }), req.body);
  transferTicket(user(req).id, req.params.id, body);
  res.json({ ok: true });
});
