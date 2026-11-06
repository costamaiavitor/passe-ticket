import { Router } from "express";
import { z } from "zod";
import {
  acceptTransfer, cancelTransfer, declineTransfer, getMyTicket, incomingTransfers, listMyTickets, offerTransfer,
} from "../domain/tickets.js";
import { parse, rateLimit, requireAuth, user } from "../lib/http.js";

export const ticketsRouter = Router();
ticketsRouter.use(requireAuth);

ticketsRouter.get("/", async (req, res) => { res.json(await listMyTickets(user(req).id)); });

// Convites de transferência recebidos (vem antes de "/:id").
ticketsRouter.get("/transfers/incoming", async (req, res) => { res.json(await incomingTransfers(user(req).id)); });
ticketsRouter.post("/transfers/:id/accept", async (req, res) => { res.json(await acceptTransfer(user(req).id, String(req.params.id))); });
ticketsRouter.post("/transfers/:id/decline", async (req, res) => {
  await declineTransfer(user(req).id, String(req.params.id));
  res.json({ ok: true });
});

ticketsRouter.get("/:id", async (req, res) => { res.json(await getMyTicket(user(req).id, String(req.params.id))); });

/** Oferece o ingresso para o CPF de outra pessoa (ela precisa aceitar). */
ticketsRouter.post("/:id/transfer", rateLimit({ windowMs: 60_000, max: 10, key: (r) => `transfer:${r.auth?.id}` }), async (req, res) => {
  const { cpf } = parse(z.object({ cpf: z.string().min(11).max(20) }), req.body);
  res.status(201).json(await offerTransfer(user(req).id, String(req.params.id), cpf));
});

/** Cancela a transferência que ainda não foi aceita. */
ticketsRouter.delete("/:id/transfer", async (req, res) => {
  await cancelTransfer(user(req).id, String(req.params.id));
  res.status(204).end();
});
