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
  // Endereço público da API. Na Vercel vem de VERCEL_PROJECT_PRODUCTION_URL (ex.: passe-ticket.vercel.app).
  publicUrl: (
    env["PUBLIC_URL"] ||
    env["RENDER_EXTERNAL_URL"] ||
    (env["VERCEL_PROJECT_PRODUCTION_URL"] ? `https://${env["VERCEL_PROJECT_PRODUCTION_URL"]}` : "") ||
    `http://localhost:${env["PORT"] ?? 3333}`
  ).replace(/\/$/, ""),
  corsOrigins: [
    ...(env["CORS_ORIGINS"] ?? "http://localhost:8080,http://localhost:5173,http://localhost:3000").split(","),
    // O domínio de produção (e o www) sempre podem chamar a API.
    ...(env["VERCEL_PROJECT_PRODUCTION_URL"]
      ? [`https://${env["VERCEL_PROJECT_PRODUCTION_URL"]}`, `https://www.${env["VERCEL_PROJECT_PRODUCTION_URL"].replace(/^www\./, "")}`]
      : []),
  ].map((s) => s.trim().replace(/\/$/, "")).filter(Boolean),
  // Endereço do site (para onde o organizador volta depois de conectar o Mercado Pago).
  // Na Vercel o site e a API estão no mesmo endereço; localmente o site roda na 8080.
  siteUrl: (env["SITE_URL"] ||
    (env["VERCEL_PROJECT_PRODUCTION_URL"] ? `https://${env["VERCEL_PROJECT_PRODUCTION_URL"]}` : "") ||
    (env["CORS_ORIGINS"] ?? "http://localhost:8080").split(",")[0]!.trim() || "http://localhost:8080").replace(/\/$/, ""),
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
  // Split 1:1: organizadores conectam a própria conta Mercado Pago (OAuth) e as vendas caem direto nela;
  // a taxa do BooTickets vai para a conta do BooTickets. MP_CLIENT_ID = "Número da aplicação"; MP_CLIENT_SECRET = "Client Secret".
  mpClientId: env["MP_CLIENT_ID"] ?? "",
  mpClientSecret: env["MP_CLIENT_SECRET"] ?? "",
  // Chave para criptografar os tokens dos organizadores no banco (se faltar, deriva do JWT_SECRET).
  tokenKey: env["TOKEN_ENCRYPTION_KEY"] || env["JWT_SECRET"] || "dev-only-token-key-change-me",
  // E-mails: SMTP_URL ex. smtps://seuemail%40gmail.com:SENHA_DE_APP@smtp.gmail.com:465 (Gmail) ou o SMTP do Resend.
  smtpUrl: env["SMTP_URL"] ?? "",
  // Atalho para Gmail: só o e-mail e a "senha de app" (16 letras) — o servidor é preenchido sozinho.
  smtpUser: env["SMTP_USER"] ?? "",
  smtpPass: (env["SMTP_PASS"] ?? "").replace(/\s+/g, ""),
  emailFrom: env["EMAIL_FROM"] || "BooTickets <no-reply@bootickets.com.br>",
  // Login com Google: o "ID do cliente" OAuth (é público; o mesmo valor vai no site como VITE_GOOGLE_CLIENT_ID).
  googleClientId: env["GOOGLE_CLIENT_ID"] ?? "",
  // Modo demonstração: libera o botão "Simular pagamento" no site publicado.
  // Qualquer visitante consegue ingresso sem pagar — nunca ligue isso para vender de verdade.
  allowSimulatedPayments: env["ALLOW_SIMULATED_PAYMENTS"] === "true",
};

if (config.isProd && !config.databaseUrl) {
  // Sem Postgres, o banco embutido gravaria em disco temporário e os dados sumiriam.
  throw new Error("Defina DATABASE_URL (Postgres/Neon) em produção");
}
if (config.isProd && config.paymentProvider === "mock" && !config.allowSimulatedPayments) {
  throw new Error("PAYMENT_PROVIDER=mock não é permitido em produção (use ALLOW_SIMULATED_PAYMENTS=true só para demonstração)");
}
if (config.isProd && config.paymentProvider === "mock") {
  console.warn("ATENÇÃO: modo demonstração — pagamentos simulados liberados, ninguém paga de verdade.");
}
if (config.paymentProvider === "mercadopago" && !config.mpAccessToken) {
  throw new Error("Defina MP_ACCESS_TOKEN para usar o Mercado Pago");
}
