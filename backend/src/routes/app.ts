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
appRouter.get("/status", (_req, res) => {
  // A chave pública VAPID vai para o navegador assinar as notificações (é pública por definição).
  res.json({ push: pushStatus(), wallet: walletStatus(), vapidPublicKey: config.vapidPublicKey || null });
});

const device = z.object({ token: z.string().min(10).max(4096), platform: z.enum(["android", "ios", "web"]) }).refine(
  (d) => d.platform !== "web" || isWebSubscription(d.token), { message: "Inscrição de notificação inválida." });

/** A inscrição do navegador precisa apontar para um serviço de push conhecido (evita usar o servidor para chamar endereços quaisquer). */
function isWebSubscription(token: string) {
  try {
    const s = JSON.parse(token) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    const host = new URL(String(s.endpoint)).hostname;
    const known = ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com", "notify.windows.com"];
    return new URL(String(s.endpoint)).protocol === "https:" && !!s.keys?.p256dh && !!s.keys?.auth
      && known.some((k) => host === k || host.endsWith(`.${k}`));
  } catch { return false; }
}
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
