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

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(cors({
    origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes("*") || config.corsOrigins.includes(origin)),
    credentials: true,
  }));
  app.use(express.json({ limit: "200kb" }));
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
  app.use("/api/v1", api);

  app.use((_req, _res, next) => next(new HttpError(404, "NOT_FOUND", "Rota não encontrada.")));
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      return void res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
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
