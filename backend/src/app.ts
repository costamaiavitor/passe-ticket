import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { isConnectionError } from "./db.js";
import { HttpError } from "./lib/errors.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { checkinRouter } from "./routes/checkin.js";
import { eventsRouter } from "./routes/events.js";
import { ordersRouter } from "./routes/orders.js";
import { organizerRouter } from "./routes/organizer.js";
import { ticketsRouter } from "./routes/tickets.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { imagesRouter } from "./routes/images.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(cors({
    origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes("*") || config.corsOrigins.includes(origin)),
    credentials: true,
  }));
  // Upload de foto tem limite próprio (maior); o resto da API aceita no máximo 200 KB.
  app.use((req, res, next) => (req.path === "/api/v1/images" && req.method === "POST" ? next() : express.json({ limit: "200kb" })(req, res, next)));
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });

  app.use("/static", express.static(fileURLToPath(new URL("../public", import.meta.url)), { maxAge: "7d" }));
  app.get("/health", (_req, res) => { res.json({ ok: true }); });

  const api = express.Router();
  api.use("/auth", authRouter);
  api.use("/events", eventsRouter);
  api.use("/orders", ordersRouter);
  api.use("/tickets", ticketsRouter);
  api.use("/checkin", checkinRouter);
  api.use("/organizer", organizerRouter);
  api.use("/admin", adminRouter);
  api.use("/webhooks", webhooksRouter);
  api.use("/images", imagesRouter);
  app.use("/api/v1", api);

  app.use((_req, _res, next) => next(new HttpError(404, "NOT_FOUND", "Rota não encontrada.")));
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      return void res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
    }
    const type = (err as { type?: string } | null)?.type;
    if (type === "entity.too.large") {
      return void res.status(413).json({ code: "TOO_LARGE", message: "O envio é grande demais. Se for uma foto, use uma imagem menor." });
    }
    if (type === "encoding.unsupported" || type === "charset.unsupported" || type === "entity.parse.failed") {
      return void res.status(400).json({ code: "INVALID_BODY", message: "Não foi possível ler os dados enviados." });
    }
    if (err instanceof SyntaxError && "body" in err) {
      return void res.status(400).json({ code: "INVALID_JSON", message: "JSON inválido." });
    }
    console.error(err);
    if (isConnectionError(err)) {
      return void res.status(503).json({ code: "UNAVAILABLE", message: "O sistema está com uma instabilidade rápida. Tente de novo em alguns segundos." });
    }
    res.status(500).json({ code: "INTERNAL", message: "Algo deu errado do nosso lado. Tente de novo em instantes." });
  });
  return app;
}
