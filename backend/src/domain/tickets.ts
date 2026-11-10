import { randomUUID } from "node:crypto";
import { all, now, one, run, tx } from "../db.js";
import { sendEmail, transferOfferEmail, transferResultEmail } from "../lib/email.js";
import { buildQrPayload, parseQrPayload } from "../lib/crypto.js";
import { isValidCpf, maskCpf, onlyDigits } from "../lib/cpf.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors.js";

export interface TicketRow {
  id: string; order_id: string; event_id: string; batch_id: string; owner_id: string; holder_name: string;
  holder_cpf: string; status: "pending" | "valid" | "used" | "cancelled"; qr_version: number; transfers: number;
  checked_in_at: string | null; checked_in_by: string | null; created_at: string;
}

interface JoinedTicket extends TicketRow {
  event_title: string; event_slug: string; starts_at: string; venue: string; city: string; cover_url: string;
  batch_name: string; max_transfers: number; transfer_deadline: string | null;
}

const SELECT = `SELECT t.*, e.title event_title, e.slug event_slug, e.starts_at, e.venue, e.city, e.cover_url,
  e.max_transfers, e.transfer_deadline, b.name batch_name
  FROM tickets t JOIN events e ON e.id = t.event_id JOIN batches b ON b.id = t.batch_id`;

function toTicket(t: JoinedTicket, pending?: { id: string; toCpf: string; createdAt: string }) {
  const deadline = t.transfer_deadline ?? t.starts_at;
  return {
    id: t.id, orderId: t.order_id, status: t.status,
    holderName: t.holder_name, holderCpf: maskCpf(t.holder_cpf),
    event: { id: t.event_id, slug: t.event_slug, title: t.event_title, startsAt: t.starts_at, venue: t.venue, city: t.city, coverUrl: t.cover_url },
    batchName: t.batch_name,
    // O QR só é entregue para ingresso pago e ainda não utilizado.
    qrPayload: t.status === "valid" ? buildQrPayload(t.id, t.qr_version) : null,
    checkedInAt: t.checked_in_at,
    transfers: t.transfers,
    canTransfer: t.status === "valid" && t.transfers < t.max_transfers && now() < deadline,
    // Transferência oferecida e ainda não aceita (o QR continua valendo até o aceite).
    pendingTransfer: pending ?? null,
  };
}

export async function listMyTickets(userId: string) {
  // Cortesias que o organizador deu e ainda aguardam a pessoa aceitar não aparecem como ingresso do organizador.
  const rows = await all<JoinedTicket>(
    `${SELECT} WHERE t.owner_id = ? AND t.status IN ('valid','used')
       AND NOT EXISTS (SELECT 1 FROM orders o JOIN ticket_transfers tt ON tt.ticket_id = t.id AND tt.status = 'pending'
                       WHERE o.id = t.order_id AND o.kind = 'courtesy' AND o.user_id = t.owner_id)
     ORDER BY e.starts_at, t.created_at`, userId);
  const pending = await pendingByTicket(rows.map((t) => t.id));
  return rows.map((t) => toTicket(t, pending.get(t.id)));
}

export async function getMyTicket(userId: string, id: string) {
  const t = await one<JoinedTicket>(`${SELECT} WHERE t.id = ?`, id);
  if (!t || t.status === "pending" || t.status === "cancelled") throw notFound("Ingresso não encontrado.");
  if (t.owner_id !== userId) throw forbidden();
  return toTicket(t, (await pendingByTicket([t.id])).get(t.id));
}

// ------------------------- Transferência com aceite -------------------------
// Quem tem o ingresso indica o CPF de quem vai receber. O ingresso fica "aguardando aceite" (o QR
// continua valendo para quem enviou). Quem tem conta com aquele CPF vê o convite em Meus ingressos e
// aceita ou recusa. Ao aceitar, o titular muda e um QR novo é gerado (o antigo para de valer).

interface TransferRow {
  id: string; ticket_id: string; from_user_id: string; to_cpf: string;
  status: "pending" | "accepted" | "declined" | "cancelled"; expires_at: string; created_at: string;
}

const PENDING_FOR_TICKET = "SELECT * FROM ticket_transfers WHERE ticket_id = ? AND status = 'pending'";

function assertTransferable(t: JoinedTicket) {
  if (t.status !== "valid") throw conflict("TICKET_USED", t.status === "used" ? "Este ingresso já foi usado na entrada." : "Este ingresso não pode ser transferido.");
  if (t.transfers >= t.max_transfers) throw conflict("TRANSFER_LIMIT", "Este ingresso já atingiu o limite de transferências do evento.");
  if (now() >= (t.transfer_deadline ?? t.starts_at)) throw conflict("TRANSFER_CLOSED", "O prazo de transferência deste evento já acabou.");
}

/** Oferece o ingresso para o CPF de outra pessoa. */
export async function offerTransfer(userId: string, ticketId: string, cpfInput: string) {
  const cpf = onlyDigits(cpfInput);
  if (!isValidCpf(cpf)) throw badRequest("INVALID_CPF", "CPF inválido. Confira os números.");
  const r = await tx(async () => {
    const t = await one<JoinedTicket>(`${SELECT} WHERE t.id = ? FOR UPDATE OF t`, ticketId);
    if (!t || t.status === "pending" || t.status === "cancelled") throw notFound("Ingresso não encontrado.");
    if (t.owner_id !== userId) throw forbidden();
    assertTransferable(t);
    if (cpf === t.holder_cpf) throw badRequest("SAME_HOLDER", "Esse CPF já é o titular deste ingresso.");
    if (await one(PENDING_FOR_TICKET, t.id))
      throw conflict("TRANSFER_PENDING", "Este ingresso já tem uma transferência aguardando aceite. Cancele antes de fazer outra.");
    const id = randomUUID();
    await run(
      "INSERT INTO ticket_transfers (id, ticket_id, from_user_id, to_cpf, status, expires_at, created_at) VALUES (?,?,?,?, 'pending', ?, ?)",
      id, t.id, userId, cpf, t.transfer_deadline ?? t.starts_at, now(),
    );
    return { id, eventTitle: t.event_title };
  });
  // Avisa por e-mail quem já tem conta com esse CPF.
  const from = await one<{ name: string }>("SELECT name FROM users WHERE id = ?", userId);
  for (const u of await all<{ email: string; name: string }>("SELECT email, name FROM users WHERE cpf = ?", cpf))
    await sendEmail(transferOfferEmail(u.email, u.name, from?.name ?? "Alguém", r.eventTitle));
  return { id: r.id };
}

/** Quem enviou desiste da transferência (antes do aceite). */
export async function cancelTransfer(userId: string, ticketId: string) {
  const t = await one<{ owner_id: string }>("SELECT owner_id FROM tickets WHERE id = ?", ticketId);
  if (!t) throw notFound("Ingresso não encontrado.");
  if (t.owner_id !== userId) throw forbidden();
  const r = await run("UPDATE ticket_transfers SET status = 'cancelled', resolved_at = ? WHERE ticket_id = ? AND status = 'pending'", now(), ticketId);
  if (!r.changes) throw notFound("Não há transferência aguardando aceite neste ingresso.");
}

/** Convites recebidos pela pessoa logada (pelo CPF da conta). */
export async function incomingTransfers(userId: string) {
  const u = await one<{ cpf: string }>("SELECT cpf FROM users WHERE id = ?", userId);
  if (!u?.cpf) return { needsCpf: true, transfers: [] };
  const rows = await all<TransferRow & JoinedTicket & { from_name: string; transfer_id: string; transfer_created: string }>(
    `SELECT tt.id transfer_id, tt.created_at transfer_created, uf.name from_name, ${SELECT.slice(7)}
       JOIN ticket_transfers tt ON tt.ticket_id = t.id JOIN users uf ON uf.id = tt.from_user_id
     WHERE tt.to_cpf = ? AND tt.status = 'pending' AND tt.expires_at > ? AND t.status = 'valid' AND t.owner_id = tt.from_user_id
     ORDER BY tt.created_at`,
    u.cpf, now(),
  );
  return {
    needsCpf: false,
    transfers: rows.map((r) => ({
      id: r.transfer_id, fromName: r.from_name, createdAt: r.transfer_created, batchName: r.batch_name,
      event: { id: r.event_id, slug: r.event_slug, title: r.event_title, startsAt: r.starts_at, venue: r.venue, city: r.city, coverUrl: r.cover_url },
    })),
  };
}

async function loadTransfer(transferId: string, userId: string) {
  const tr = await one<TransferRow>("SELECT * FROM ticket_transfers WHERE id = ? FOR UPDATE", transferId);
  if (!tr) throw notFound("Transferência não encontrada.");
  const me = (await one<{ cpf: string; name: string; email: string }>("SELECT cpf, name, email FROM users WHERE id = ?", userId))!;
  if (!me.cpf || me.cpf !== tr.to_cpf) throw forbidden("Esta transferência foi enviada para outro CPF.");
  if (tr.status !== "pending") throw conflict("TRANSFER_CLOSED", "Esta transferência não está mais disponível.");
  if (tr.expires_at <= now()) throw conflict("TRANSFER_CLOSED", "O prazo desta transferência já acabou.");
  return { tr, me };
}

/** Aceita: o ingresso passa para a conta, nome e CPF de quem aceitou, com QR novo. */
export async function acceptTransfer(userId: string, transferId: string) {
  const r = await tx(async () => {
    const { tr, me } = await loadTransfer(transferId, userId);
    const t = await one<JoinedTicket>(`${SELECT} WHERE t.id = ? FOR UPDATE OF t`, tr.ticket_id);
    if (!t || t.owner_id !== tr.from_user_id) throw conflict("TRANSFER_CLOSED", "Esta transferência não está mais disponível.");
    assertTransferable(t);
    // Trava o evento para o limite por CPF não ser furado por compras simultâneas.
    const ev = (await one<{ max_per_cpf: number }>("SELECT max_per_cpf FROM events WHERE id = ? FOR UPDATE", t.event_id))!;
    const { c } = (await one<{ c: number }>(
      "SELECT COUNT(*) c FROM tickets WHERE event_id = ? AND holder_cpf = ? AND status IN ('pending','valid','used')", t.event_id, me.cpf,
    ))!;
    if (c >= ev.max_per_cpf) throw conflict("CPF_LIMIT", `Seu CPF já tem ${ev.max_per_cpf} ingresso(s) neste evento, que é o limite.`);
    await run(
      "UPDATE tickets SET owner_id = ?, holder_name = ?, holder_cpf = ?, qr_version = qr_version + 1, transfers = transfers + 1 WHERE id = ?",
      userId, me.name, me.cpf, t.id,
    );
    await run("UPDATE ticket_transfers SET status = 'accepted', resolved_at = ?, accepted_by = ? WHERE id = ?", now(), userId, tr.id);
    return { ticketId: t.id, fromUserId: tr.from_user_id, toName: me.name, eventTitle: t.event_title };
  });
  const from = await one<{ email: string; name: string }>("SELECT email, name FROM users WHERE id = ?", r.fromUserId);
  if (from) await sendEmail(transferResultEmail(from.email, from.name, r.toName, r.eventTitle, true));
  return { ticketId: r.ticketId };
}

/** Recusa: o ingresso continua com quem enviou. */
export async function declineTransfer(userId: string, transferId: string) {
  const r = await tx(async () => {
    const { tr, me } = await loadTransfer(transferId, userId);
    await run("UPDATE ticket_transfers SET status = 'declined', resolved_at = ? WHERE id = ?", now(), tr.id);
    const ev = await one<{ title: string }>("SELECT e.title FROM tickets t JOIN events e ON e.id = t.event_id WHERE t.id = ?", tr.ticket_id);
    return { fromUserId: tr.from_user_id, toName: me.name, eventTitle: ev?.title ?? "" };
  });
  const from = await one<{ email: string; name: string }>("SELECT email, name FROM users WHERE id = ?", r.fromUserId);
  if (from) await sendEmail(transferResultEmail(from.email, from.name, r.toName, r.eventTitle, false));
}

/** Transferências pendentes dos ingressos de quem enviou (para mostrar "aguardando aceite"). */
async function pendingByTicket(ticketIds: string[]) {
  if (!ticketIds.length) return new Map<string, { id: string; toCpf: string; createdAt: string }>();
  const rows = await all<TransferRow>(
    `SELECT * FROM ticket_transfers WHERE status = 'pending' AND ticket_id IN (${ticketIds.map(() => "?").join(",")})`, ...ticketIds);
  return new Map(rows.map((r) => [r.ticket_id, { id: r.id, toCpf: maskCpf(r.to_cpf), createdAt: r.created_at }]));
}

// ------------------------- Portaria -------------------------
export type ScanResult = "ok" | "already_used" | "invalid" | "revoked" | "wrong_event" | "not_paid" | "cancelled";

const MESSAGES: Record<ScanResult, string> = {
  ok: "Entrada liberada",
  already_used: "Ingresso já utilizado",
  invalid: "QR Code inválido",
  revoked: "QR Code antigo — ingresso foi transferido",
  wrong_event: "Ingresso de outro evento",
  not_paid: "Pagamento não confirmado",
  cancelled: "Ingresso cancelado",
};

/**
 * Valida o QR e dá baixa no ingresso de forma atômica: o UPDATE só passa se o
 * ingresso ainda estiver 'valid', então dois seguranças lendo o mesmo QR ao
 * mesmo tempo nunca liberam duas entradas.
 */
export async function scanTicket(staffId: string, eventId: string, code: string) {
  const at = now();
  const log = (result: ScanResult, ticketId: string | null) =>
    run("INSERT INTO checkins (event_id, ticket_id, staff_id, result, at) VALUES (?,?,?,?,?)", eventId, ticketId, staffId, result, at);

  const parsed = parseQrPayload(code);
  const t = parsed ? await one<JoinedTicket>(`${SELECT} WHERE t.id = ?`, parsed.ticketId) : undefined;

  const respond = async (result: ScanResult, extra: Record<string, unknown> = {}) => {
    await log(result, t?.id ?? null);
    return {
      result, ok: result === "ok", message: MESSAGES[result], scannedAt: at,
      ticket: t && result !== "invalid"
        ? { id: t.id, holderName: t.holder_name, holderCpf: maskCpf(t.holder_cpf), batchName: t.batch_name, eventTitle: t.event_title }
        : null,
      ...extra,
    };
  };

  if (!parsed || !t) return respond("invalid");
  if (t.event_id !== eventId) return respond("wrong_event");
  if (parsed.version !== t.qr_version) return respond("revoked");
  if (t.status === "pending") return respond("not_paid");
  if (t.status === "cancelled") return respond("cancelled");
  if (t.status === "used") return respond("already_used", { checkedInAt: t.checked_in_at });

  const r = await run(
    "UPDATE tickets SET status = 'used', checked_in_at = ?, checked_in_by = ? WHERE id = ? AND status = 'valid' AND qr_version = ?",
    at, staffId, t.id, parsed.version,
  );
  if (r.changes === 0) {
    const cur = (await one<TicketRow>("SELECT * FROM tickets WHERE id = ?", t.id))!;
    return respond(cur.status === "used" ? "already_used" : "invalid", { checkedInAt: cur.checked_in_at });
  }
  return respond("ok", { checkedInAt: at });
}

export async function eventCheckinStats(eventId: string) {
  const s = (await one<{ total: number; used: number }>(
    "SELECT COUNT(*) total, COUNT(*) FILTER (WHERE status = 'used') used FROM tickets WHERE event_id = ? AND status IN ('valid','used')", eventId,
  ))!;
  const recent = await all<{ result: string; at: string; holder_name: string | null }>(
    `SELECT c.result, c.at, t.holder_name FROM checkins c LEFT JOIN tickets t ON t.id = c.ticket_id
     WHERE c.event_id = ? ORDER BY c.id DESC LIMIT 20`, eventId,
  );
  return { totalTickets: s.total, checkedIn: s.used, remaining: s.total - s.used, recent };
}
