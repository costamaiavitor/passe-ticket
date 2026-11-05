import { Router } from "express";
import { z } from "zod";
import { getMyTicket, listMyTickets, transferTicket } from "../domain/tickets.js";
import { parse, requireAuth, user } from "../lib/http.js";

export const ticketsRouter = Router();
ticketsRouter.use(requireAuth);

ticketsRouter.get("/", async (req, res) => { res.json(await listMyTickets(user(req).id)); });
ticketsRouter.get("/:id", async (req, res) => { res.json(await getMyTicket(user(req).id, req.params.id)); });

ticketsRouter.post("/:id/transfer", async (req, res) => {
  const body = parse(z.object({ email: z.string().email(), holderName: z.string().trim().min(3), holderCpf: z.string() }), req.body);
  await transferTicket(user(req).id, req.params.id, body);
  res.json({ ok: true });
});
