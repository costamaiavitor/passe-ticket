// Conexão da conta Mercado Pago do organizador (split 1:1).
import { Router } from "express";
import { config } from "../config.js";
import { connectionInfo, disconnect, finishConnect, startConnect } from "../domain/mpaccounts.js";
import { rateLimit, requireRole, user } from "../lib/http.js";

/** Volta do Mercado Pago depois que o organizador autoriza. Rota pública: quem é o organizador vem do "state". */
export const mpCallbackRouter = Router();
mpCallbackRouter.get("/oauth/callback", rateLimit({ windowMs: 60_000, max: config.isTest ? 1000 : 20, key: (r) => `mpcb:${r.ip}` }), async (req, res) => {
  const back = (r: string) => res.redirect(302, `${config.siteUrl}/organizador?mp=${r}`);
  const code = typeof req.query["code"] === "string" ? req.query["code"] : "";
  const state = typeof req.query["state"] === "string" ? req.query["state"] : "";
  if (!code || !state) return back(req.query["error"] ? "negado" : "erro");
  try {
    await finishConnect(state, code);
    back("ok");
  } catch (e) {
    console.error("Falha ao conectar conta Mercado Pago:", e);
    back("erro");
  }
});

/** Área do organizador: ver, conectar e desconectar a conta. */
export const mpOrganizerRouter = Router();
mpOrganizerRouter.use(requireRole("organizer"));
mpOrganizerRouter.get("/", async (req, res) => res.json(await connectionInfo(user(req).id)));
mpOrganizerRouter.post("/connect", async (req, res) => res.json({ url: await startConnect(user(req).id) }));
mpOrganizerRouter.delete("/", async (req, res) => {
  await disconnect(user(req).id);
  res.json(await connectionInfo(user(req).id));
});
