import { all, now, one, run, tx } from "../db.ts";
import { buildQrPayload, parseQrPayload } from "../lib/crypto.ts";
import { isValidCpf, maskCpf, onlyDigits } from "../lib/cpf.ts";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors.ts";

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

function toTicket(t: JoinedTicket) {
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
  };
}

export const listMyTickets = (userId: string) =>
  all<JoinedTicket>(`${SELECT} WHERE t.owner_id = ? AND t.status IN ('valid','used') ORDER BY e.starts_at, t.created_at`, userId).map(toTicket);

export function getMyTicket(userId: string, id: string) {
  const t = one<JoinedTicket>(`${SELECT} WHERE t.id = ?`, id);
  if (!t || t.status === "pending" || t.status === "cancelled") throw notFound("Ingresso não encontrado.");
  if (t.owner_id !== userId) throw forbidden();
  return toTicket(t);
}

/** Transfere para outra conta: troca titular e gera QR novo (o antigo deixa de valer). */
export function transferTicket(userId: string, id: string, input: { email: string; holderName: string; holderCpf: string }) {
  const cpf = onlyDigits(input.holderCpf);
  if (!isValidCpf(cpf)) throw badRequest("INVALID_CPF", "CPF do novo titular inválido.");
  return tx(() => {
    const t = one<JoinedTicket>(`${SELECT} WHERE t.id = ?`, id);
    if (!t || t.status === "pending" || t.status === "cancelled") throw notFound("Ingresso não encontrado.");
    if (t.owner_id !== userId) throw forbidden();
    if (t.status !== "valid") throw conflict("TICKET_USED", "Ingresso já utilizado.");
    if (t.transfers >= t.max_transfers) throw conflict("TRANSFER_LIMIT", "Limite de transferências atingido.");
    if (now() >= (t.transfer_deadline ?? t.starts_at)) throw conflict("TRANSFER_CLOSED", "Prazo de transferência encerrado.");
    const to = one<{ id: string }>("SELECT id FROM users WHERE email = ?", input.email.trim().toLowerCase());
    if (!to) throw notFound("Não existe conta com esse e-mail. Peça para a pessoa se cadastrar primeiro.");
    if (to.id === userId && cpf === t.holder_cpf) throw badRequest("SAME_HOLDER", "Esse já é o titular atual.");
    const ev = one<{ max_per_cpf: number }>("SELECT max_per_cpf FROM events WHERE id = ?", t.event_id)!;
    if (cpf !== t.holder_cpf) {
      const { c } = one<{ c: number }>(
        "SELECT COUNT(*) c FROM tickets WHERE event_id = ? AND holder_cpf = ? AND status IN ('pending','valid','used')", t.event_id, cpf,
      )!;
      if (c >= ev.max_per_cpf) throw conflict("CPF_LIMIT", `Esse CPF já tem ${ev.max_per_cpf} ingressos neste evento.`);
    }
    run(
      "UPDATE tickets SET owner_id = ?, holder_name = ?, holder_cpf = ?, qr_version = qr_version + 1, transfers = transfers + 1 WHERE id = ?",
      to.id, input.holderName.trim(), cpf, t.id,
    );
    return { id: t.id };
  });
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
export function scanTicket(staffId: string, eventId: string, code: string) {
  const at = now();
  const log = (result: ScanResult, ticketId: string | null) =>
    run("INSERT INTO checkins (event_id, ticket_id, staff_id, result, at) VALUES (?,?,?,?,?)", eventId, ticketId, staffId, result, at);

  const parsed = parseQrPayload(code);
  const t = parsed ? one<JoinedTicket>(`${SELECT} WHERE t.id = ?`, parsed.ticketId) : undefined;

  const respond = (result: ScanResult, extra: Record<string, unknown> = {}) => {
    log(result, t?.id ?? null);
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

  const r = run(
    "UPDATE tickets SET status = 'used', checked_in_at = ?, checked_in_by = ? WHERE id = ? AND status = 'valid' AND qr_version = ?",
    at, staffId, t.id, parsed.version,
  );
  if (r.changes === 0) {
    const cur = one<TicketRow>("SELECT * FROM tickets WHERE id = ?", t.id)!;
    return respond(cur.status === "used" ? "already_used" : "invalid", { checkedInAt: cur.checked_in_at });
  }
  return respond("ok", { checkedInAt: at });
}

export function eventCheckinStats(eventId: string) {
  const s = one<{ total: number; used: number }>(
    "SELECT COUNT(*) total, COALESCE(SUM(status = 'used'), 0) used FROM tickets WHERE event_id = ? AND status IN ('valid','used')", eventId,
  )!;
  const recent = all<{ result: string; at: string; holder_name: string | null }>(
    `SELECT c.result, c.at, t.holder_name FROM checkins c LEFT JOIN tickets t ON t.id = c.ticket_id
     WHERE c.event_id = ? ORDER BY c.id DESC LIMIT 20`, eventId,
  );
  return { totalTickets: s.total, checkedIn: s.used, remaining: s.total - s.used, recent };
}
