// Recursos do app das lojas que também valem no site: notificações e "Adicionar à Carteira".
import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { registerDevice, sendEventReminders, unregisterDevice } from "../domain/notifications.js";
import { unauthorized } from "../lib/errors.js";
import { parse, rateLimit, requireAuth, user } from "../lib/http.js";
import { pushStatus } from "../lib/push.js";
import { applePass, appleWalletLink, checkAppleLink, googleWalletUrl, walletStatus, walletTicket } from "../lib/wallet.js";

export const appRouter = Router();

/** O que está ligado (o site e o app só mostram o que funciona). */
appRouter.get("/status", (_req, res) => { res.json({ push: pushStatus(), wallet: walletStatus() }); });

const device = z.object({ token: z.string().min(10).max(4096), platform: z.enum(["android", "ios"]) });
appRouter.post("/devices", requireAuth, rateLimit({ windowMs: 60_000, max: 20, key: (r) => `dev:${r.auth?.id}` }), async (req, res) => {
  const d = parse(device, req.body);
  await registerDevice(user(req).id, d.token, d.platform);
  res.status(204).end();
});
appRouter.post("/devices/remove", requireAuth, async (req, res) => {
  const d = parse(z.object({ token: z.string().min(10).max(4096) }), req.body);
  await unregisterDevice(user(req).id, d.token);
  res.status(204).end();
});

appRouter.get("/tickets/:id/wallet/google", requireAuth, async (req, res) => {
  res.json({ url: await googleWalletUrl(await walletTicket(String(req.params.id), user(req).id)) });
});
appRouter.get("/tickets/:id/wallet/apple", requireAuth, async (req, res) => {
  await walletTicket(String(req.params.id), user(req).id);
  res.json({ url: appleWalletLink(String(req.params.id)) });
});
/** O arquivo .pkpass em si (link assinado, sem login: quem abre é o Safari/Carteira do iPhone). */
appRouter.get("/wallet/apple/:file", async (req, res) => {
  const id = String(req.params.file).replace(/\.pkpass$/, "");
  checkAppleLink(id, String(req.query["exp"] ?? ""), String(req.query["sig"] ?? ""));
  const buf = await applePass(await walletTicket(id));
  res.setHeader("Content-Type", "application/vnd.apple.pkpass");
  res.setHeader("Content-Disposition", `attachment; filename="bootickets-${id.slice(0, 8)}.pkpass"`);
  res.setHeader("Cache-Control", "no-store");
  res.end(buf);
});

/** Lembrete diário "sua festa é hoje" (chamado pela Vercel com o CRON_SECRET). */
appRouter.get("/cron/lembretes", async (req, res) => {
  const given = Buffer.from(req.headers.authorization ?? "");
  const want = Buffer.from(`Bearer ${config.cronSecret}`);
  if (!config.cronSecret || given.length !== want.length || !timingSafeEqual(given, want)) throw unauthorized("Sem permissão.");
  res.json(await sendEventReminders());
});
