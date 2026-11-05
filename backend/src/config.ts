const env = process.env;

function secret(name: string, fallback: string): string {
  const v = env[name];
  if (v && v.length >= 16) return v;
  if (env["NODE_ENV"] === "production") throw new Error(`${name} precisa ter pelo menos 16 caracteres em produção`);
  return fallback;
}

const isProd = env["NODE_ENV"] === "production";

export const config = {
  isProd,
  isTest: env["NODE_ENV"] === "test",
  port: Number(env["PORT"] ?? 3333),
  // No Render, RENDER_EXTERNAL_URL já vem preenchida com a URL pública do serviço.
  publicUrl: (env["PUBLIC_URL"] || env["RENDER_EXTERNAL_URL"] || `http://localhost:${env["PORT"] ?? 3333}`).replace(/\/$/, ""),
  corsOrigins: (env["CORS_ORIGINS"] ?? "http://localhost:8080,http://localhost:5173,http://localhost:3000")
    .split(",").map((s) => s.trim()).filter(Boolean),
  // Postgres (Neon). Sem ela, usa o Postgres embutido (PGlite) na pasta localDataDir.
  databaseUrl: env["DATABASE_URL"] || env["POSTGRES_URL"] || "",
  localDataDir: env["LOCAL_DATA_DIR"] ?? "./data/pglite",
  jwtSecret: secret("JWT_SECRET", "dev-only-jwt-secret-change-me"),
  qrSecret: secret("QR_SECRET", "dev-only-qr-secret-change-me"),
  accessTokenTtlSec: 15 * 60,
  refreshTokenTtlSec: 30 * 24 * 3600,
  adminEmails: (env["ADMIN_EMAILS"] ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  feeRate: Number(env["PLATFORM_FEE_RATE"] ?? 0.1),
  reservationMinutes: Number(env["ORDER_RESERVATION_MINUTES"] ?? 15),
  maxTicketsPerOrder: Number(env["MAX_TICKETS_PER_ORDER"] ?? 10),
  defaultMaxPerCpf: 2,
  paymentProvider: (env["PAYMENT_PROVIDER"] ?? "mock") as "mock" | "mercadopago",
  mpAccessToken: env["MP_ACCESS_TOKEN"] ?? "",
  mpWebhookSecret: env["MP_WEBHOOK_SECRET"] ?? "",
};

if (config.isProd && config.paymentProvider === "mock") {
  throw new Error("PAYMENT_PROVIDER=mock não é permitido em produção");
}
if (config.paymentProvider === "mercadopago" && !config.mpAccessToken) {
  throw new Error("Defina MP_ACCESS_TOKEN para usar o Mercado Pago");
}
