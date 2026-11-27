// "Adicionar à Carteira": o ingresso vira um cartão no Apple Wallet (iPhone) ou no Google Wallet
// (Android), com o mesmo QR Code de Meus ingressos. Funciona no site e no app.
// Sem as chaves configuradas, os botões não aparecem (walletStatus() devolve false).
//
// Atenção: o QR guardado na Carteira é o do momento em que a pessoa adicionou. Se o ingresso for
// transferido, o QR antigo deixa de valer na portaria (igual ao print do QR).
import { createHmac, timingSafeEqual } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";
import { PKPass } from "passkit-generator";
import { config } from "../config.js";
import { one } from "../db.js";
import { buildQrPayload } from "./crypto.js";
import { forbidden, notFound } from "./errors.js";
import { walletImages } from "./wallet-images.js";

interface WalletTicket {
  id: string; owner_id: string; status: string; qr_version: number; holder_name: string; batch_name: string;
  event_id: string; title: string; starts_at: string; venue: string; city: string; cover_url: string;
}

interface ServiceAccount { client_email: string; private_key: string }
const googleAccount = (): ServiceAccount | null => {
  if (!config.googleWalletIssuerId || !config.googleWalletServiceAccount) return null;
  try { return JSON.parse(config.googleWalletServiceAccount) as ServiceAccount; } catch { return null; }
};
const appleReady = () => !!(config.applePassTypeId && config.apnsTeamId && config.applePassCert && config.applePassKey && config.appleWwdrCert);

export const walletStatus = () => ({ apple: appleReady(), google: !!googleAccount() });

/** Ingresso válido da própria pessoa (o QR só existe para ingresso pago e ainda não usado). */
export async function walletTicket(ticketId: string, userId?: string) {
  const t = await one<WalletTicket>(
    `SELECT t.id, t.owner_id, t.status, t.qr_version, t.holder_name, b.name batch_name,
            e.id event_id, e.title, e.starts_at, e.venue, e.city, e.cover_url
       FROM tickets t JOIN events e ON e.id = t.event_id JOIN batches b ON b.id = t.batch_id WHERE t.id = ?`, ticketId);
  if (!t || t.status !== "valid") throw notFound("Ingresso não encontrado ou já utilizado.");
  if (userId && t.owner_id !== userId) throw forbidden();
  return t;
}

const absolute = (url: string) => (/^https?:\/\//.test(url) ? url : `${config.siteUrl}${url.startsWith("/") ? "" : "/"}${url}`);
const lang = (value: string) => ({ defaultValue: { language: "pt-BR", value } });
/** O Google só aceita letras, números, ponto, hífen e sublinhado nos IDs. */
const gid = (s: string) => s.replace(/[^\w.-]/g, "_");

// ---------------- Google Wallet ----------------
/** Link "Salvar no Google Wallet" (o cartão é criado na hora em que a pessoa abre o link). */
export async function googleWalletUrl(t: WalletTicket) {
  const sa = googleAccount();
  if (!sa) throw notFound("Google Wallet ainda não está disponível.");
  const issuer = config.googleWalletIssuerId;
  const classId = `${issuer}.${gid(`evento-${t.event_id}`)}`;
  const cover = absolute(t.cover_url);
  const payload = {
    eventTicketClasses: [{
      id: classId,
      issuerName: "BooTickets",
      reviewStatus: "UNDER_REVIEW",
      eventName: lang(t.title),
      venue: { name: lang(t.venue), address: lang(t.city) },
      dateTime: { start: t.starts_at },
      hexBackgroundColor: "#090B0F",
      logo: { sourceUri: { uri: `${config.siteUrl}/apple-touch-icon.png` } },
      ...(cover.startsWith("https://") ? { heroImage: { sourceUri: { uri: cover } } } : {}),
    }],
    eventTicketObjects: [{
      // A versão do QR entra no ID: depois de uma transferência sai um cartão novo, com o QR novo.
      id: `${issuer}.${gid(`ingresso-${t.id}-v${t.qr_version}`)}`,
      classId,
      state: "ACTIVE",
      ticketHolderName: t.holder_name,
      ticketType: lang(t.batch_name),
      barcode: { type: "QR_CODE", value: buildQrPayload(t.id, t.qr_version), alternateText: `#${t.id.slice(0, 8)}` },
      validTimeInterval: { end: { date: new Date(Date.parse(t.starts_at) + 24 * 3600_000).toISOString() } },
    }],
  };
  const key = await importPKCS8(sa.private_key, "RS256");
  const jwt = await new SignJWT({ typ: "savetowallet", origins: [config.siteUrl], payload })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email).setAudience("google").setIssuedAt().sign(key);
  return `https://pay.google.com/gp/v/save/${jwt}`;
}

// ---------------- Apple Wallet ----------------
// O iPhone baixa o arquivo .pkpass sem o login do site, então o link leva uma assinatura que vale 10 min.
const sign = (ticketId: string, exp: number) => createHmac("sha256", config.qrSecret).update(`wallet:${ticketId}:${exp}`).digest("base64url");

export function appleWalletLink(ticketId: string) {
  if (!appleReady()) throw notFound("Apple Wallet ainda não está disponível.");
  const exp = Date.now() + 10 * 60_000;
  return `${config.publicUrl}/api/v1/app/wallet/apple/${ticketId}.pkpass?exp=${exp}&sig=${sign(ticketId, exp)}`;
}

export function checkAppleLink(ticketId: string, exp: string, sig: string) {
  const n = Number(exp);
  const good = Buffer.from(sign(ticketId, n));
  const given = Buffer.from(String(sig));
  if (!Number.isFinite(n) || n < Date.now() || good.length !== given.length || !timingSafeEqual(good, given))
    throw forbidden("Este link expirou. Volte em Meus ingressos e toque em Adicionar à Carteira de novo.");
}

export async function applePass(t: WalletTicket) {
  if (!appleReady()) throw notFound("Apple Wallet ainda não está disponível.");
  const files = Object.fromEntries(Object.entries(walletImages).map(([k, v]) => [k, Buffer.from(v, "base64")]));
  const pass = new PKPass(files, {
    wwdr: config.appleWwdrCert, signerCert: config.applePassCert, signerKey: config.applePassKey,
    ...(config.applePassKeyPassphrase ? { signerKeyPassphrase: config.applePassKeyPassphrase } : {}),
  }, {
    formatVersion: 1,
    passTypeIdentifier: config.applePassTypeId,
    teamIdentifier: config.apnsTeamId,
    serialNumber: `${t.id}-v${t.qr_version}`,
    organizationName: "BooTickets",
    description: `Ingresso para ${t.title}`,
    logoText: "BooTickets",
    backgroundColor: "rgb(9,11,15)",
    foregroundColor: "rgb(245,247,250)",
    labelColor: "rgb(176,110,255)",
  });
  pass.type = "eventTicket";
  const when = new Date(t.starts_at);
  const date = when.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" });
  pass.primaryFields.push({ key: "evento", label: "EVENTO", value: t.title });
  pass.secondaryFields.push({ key: "quando", label: "QUANDO", value: date }, { key: "lote", label: "LOTE", value: t.batch_name });
  pass.auxiliaryFields.push({ key: "titular", label: "TITULAR", value: t.holder_name }, { key: "local", label: "LOCAL", value: `${t.venue}, ${t.city}` });
  pass.backFields.push(
    { key: "regra", label: "Na entrada", value: "Apresente este QR Code junto com um documento com foto do titular." },
    { key: "codigo", label: "Ingresso", value: `#${t.id.slice(0, 8)}` },
    { key: "site", label: "Meus ingressos", value: `${config.siteUrl}/ingressos` },
  );
  pass.setBarcodes({ message: buildQrPayload(t.id, t.qr_version), format: "PKBarcodeFormatQR", messageEncoding: "iso-8859-1", altText: `#${t.id.slice(0, 8)}` });
  pass.setRelevantDates([{ relevantDate: when.toISOString() }]);
  pass.setExpirationDate(new Date(when.getTime() + 24 * 3600_000));
  return pass.getAsBuffer();
}
