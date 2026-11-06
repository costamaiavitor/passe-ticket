// Envio de e-mails por SMTP (Gmail com "senha de app" agora; Resend/SendGrid depois, só trocando SMTP_URL).
// Sem SMTP_URL configurado, os e-mails só aparecem no log (útil em desenvolvimento).
import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../config.js";

export interface Email { to: string; subject: string; html: string; text: string }

/** Nos testes automáticos os e-mails ficam aqui em vez de sair. */
export const sentEmails: Email[] = [];

let transport: Transporter | null = null;
const getTransport = () => (transport ??= config.smtpUrl
  ? nodemailer.createTransport(config.smtpUrl)
  : nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: config.smtpUser, pass: config.smtpPass } }));
const configured = () => !!config.smtpUrl || (!!config.smtpUser && !!config.smtpPass);
const fromAddress = () => (config.smtpUser && !config.smtpUrl ? `Passe <${config.smtpUser}>` : config.emailFrom);

/** Envia sem nunca derrubar a operação principal (compra, cadastro…): falha vira só um aviso no log. */
export async function sendEmail(mail: Email): Promise<boolean> {
  if (config.isTest) { sentEmails.push(mail); return true; }
  if (!configured()) {
    console.log(`[e-mail não enviado — configure SMTP_USER/SMTP_PASS] para ${mail.to}: ${mail.subject}`);
    return false;
  }
  try {
    await getTransport().sendMail({ from: fromAddress(), to: mail.to, subject: mail.subject, html: mail.html, text: mail.text });
    return true;
  } catch (e) {
    console.error(`Falha ao enviar e-mail para ${mail.to} (${mail.subject}):`, e);
    return false;
  }
}

// ---------------- Modelos ----------------
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" });

/** Moldura dos e-mails: cores do site, sem imagens externas (abre bem em qualquer app de e-mail). */
function layout(title: string, body: string, cta?: { label: string; url: string }) {
  const button = cta
    ? `<p style="margin:28px 0 8px"><a href="${esc(cta.url)}" style="background:#B8F34A;color:#14200A;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px;display:inline-block">${esc(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#090B0F;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#F5F7FA">
  <div style="max-width:520px;margin:0 auto;background:#171A21;border:1px solid #272D38;border-radius:12px;padding:28px">
    <p style="margin:0 0 20px;font-weight:700;font-size:18px"><span style="background:#B8F34A;color:#14200A;border-radius:6px;padding:2px 7px;margin-right:6px">▣</span>Passe</p>
    <h1 style="margin:0 0 12px;font-size:20px">${esc(title)}</h1>
    <div style="font-size:15px;line-height:1.55;color:#C9CED8">${body}</div>
    ${button}
    <p style="margin:28px 0 0;font-size:12px;color:#9299A7">Passe · Ingressos com segurança · <a href="${config.publicUrl}" style="color:#9299A7">${config.publicUrl.replace(/^https?:\/\//, "")}</a></p>
  </div></body></html>`;
}

export function passwordResetEmail(to: string, name: string, link: string): Email {
  return {
    to,
    subject: "Redefina sua senha do Passe",
    html: layout("Redefinir senha", `<p>Oi, ${esc(name)}!</p><p>Recebemos um pedido para trocar a senha da sua conta. O link vale por <strong>1 hora</strong>.</p><p>Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>`,
      { label: "Criar nova senha", url: link }),
    text: `Oi, ${name}! Para criar uma nova senha no Passe, abra: ${link} (vale por 1 hora). Se não foi você, ignore este e-mail.`,
  };
}

export interface PurchaseEmailData {
  to: string; name: string; orderId: string; eventTitle: string; startsAt: string; venue: string; city: string;
  batchName: string; total: number; holders: string[];
}
export function purchaseEmail(d: PurchaseEmailData): Email {
  const link = `${config.publicUrl}/ingressos`;
  const holders = d.holders.map((h) => `<li>${esc(h)}</li>`).join("");
  return {
    to: d.to,
    subject: `Seus ingressos para ${d.eventTitle}`,
    html: layout("Compra confirmada! 🎉", `
      <p>Oi, ${esc(d.name)}! Seu pagamento foi aprovado.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;color:#C9CED8">
        <tr><td style="padding:4px 0;color:#9299A7">Evento</td><td style="text-align:right;color:#F5F7FA"><strong>${esc(d.eventTitle)}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#9299A7">Quando</td><td style="text-align:right">${esc(fmtDateTime(d.startsAt))}</td></tr>
        <tr><td style="padding:4px 0;color:#9299A7">Onde</td><td style="text-align:right">${esc(d.venue)}, ${esc(d.city)}</td></tr>
        <tr><td style="padding:4px 0;color:#9299A7">Ingresso</td><td style="text-align:right">${d.holders.length}× ${esc(d.batchName)}</td></tr>
        <tr><td style="padding:4px 0;color:#9299A7">Total pago</td><td style="text-align:right">${brl(d.total)}</td></tr>
      </table>
      <p style="margin:0">Titulares:</p><ul style="margin:6px 0 16px">${holders}</ul>
      <p>O QR Code de cada ingresso está em <strong>Meus ingressos</strong>. Na entrada, mostre o QR e um documento com foto do titular.</p>
      <p style="font-size:13px;color:#9299A7">Pedido #${esc(d.orderId.slice(0, 8))}. Não compartilhe o QR Code: ele vale para uma única entrada.</p>`,
      { label: "Ver meus ingressos", url: link }),
    text: `Compra confirmada! ${d.eventTitle} — ${fmtDateTime(d.startsAt)}, ${d.venue}, ${d.city}. ${d.holders.length}× ${d.batchName}, total ${brl(d.total)}. Seus QR Codes: ${link}`,
  };
}

export function eventCancelledEmail(to: string, name: string, eventTitle: string, total: number): Email {
  return {
    to,
    subject: `Evento cancelado: ${eventTitle}`,
    html: layout("Evento cancelado", `<p>Oi, ${esc(name)}.</p><p>O organizador cancelou o evento <strong>${esc(eventTitle)}</strong>. Seus ingressos foram cancelados e o valor de <strong>${brl(total)}</strong> foi estornado pelo Mercado Pago.</p><p>No cartão, o estorno pode levar até 2 faturas para aparecer; no Pix, volta para a conta de origem.</p>`),
    text: `O evento ${eventTitle} foi cancelado. O valor de ${brl(total)} foi estornado pelo Mercado Pago.`,
  };
}

export function eventForReviewEmail(to: string, eventTitle: string, organizer: string): Email {
  const link = `${config.publicUrl}/admin`;
  return {
    to,
    subject: `Novo evento para aprovar: ${eventTitle}`,
    html: layout("Evento aguardando aprovação", `<p><strong>${esc(organizer)}</strong> criou o evento <strong>${esc(eventTitle)}</strong>. Ele só aparece no site depois que você aprovar.</p>`,
      { label: "Revisar evento", url: link }),
    text: `${organizer} criou o evento ${eventTitle}. Aprove em ${link}`,
  };
}

export function eventReviewedEmail(to: string, name: string, eventTitle: string, approved: boolean, reason: string, slug: string): Email {
  const link = approved ? `${config.publicUrl}/eventos/${slug}` : `${config.publicUrl}/organizador`;
  return {
    to,
    subject: approved ? `Seu evento foi aprovado: ${eventTitle}` : `Seu evento não foi aprovado: ${eventTitle}`,
    html: approved
      ? layout("Evento aprovado! 🎉", `<p>Oi, ${esc(name)}! O evento <strong>${esc(eventTitle)}</strong> já está no ar e os ingressos estão à venda. Divulgue o link!</p>`, { label: "Ver página do evento", url: link })
      : layout("Evento não aprovado", `<p>Oi, ${esc(name)}. O evento <strong>${esc(eventTitle)}</strong> não foi aprovado.</p>${reason ? `<p>Motivo: ${esc(reason)}</p>` : ""}<p>Ajuste as informações e fale com a gente respondendo este e-mail.</p>`, { label: "Meus eventos", url: link }),
    text: approved ? `O evento ${eventTitle} foi aprovado e está no ar: ${link}` : `O evento ${eventTitle} não foi aprovado. ${reason}`,
  };
}

export function payoutEmail(to: string, name: string, eventTitle: string, amount: number, note: string): Email {
  return {
    to,
    subject: `Repasse enviado: ${eventTitle}`,
    html: layout("Repasse enviado", `<p>Oi, ${esc(name)}! Enviamos <strong>${brl(amount)}</strong> referente às vendas de <strong>${esc(eventTitle)}</strong>.</p>${note ? `<p>Observação: ${esc(note)}</p>` : ""}`,
      { label: "Ver meus eventos", url: `${config.publicUrl}/organizador` }),
    text: `Repasse de ${brl(amount)} enviado referente a ${eventTitle}. ${note}`,
  };
}
