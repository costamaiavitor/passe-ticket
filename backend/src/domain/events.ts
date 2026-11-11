import { all, one } from "../db.js";

export interface EventRow {
  id: string; slug: string; organizer_id: string; title: string; category: string; cover_url: string;
  starts_at: string; venue: string; city: string; address: string; description: string; important_info: string;
  refund_policy: string; max_transfers: number; transfer_deadline: string | null; max_per_cpf: number;
  featured: number; status: string; created_at: string; review_note?: string;
  visibility: "public" | "unlisted"; access_code: string;
}

/** Palavra-senha comparada sem diferenciar maiúsculas, acentos e espaços nas pontas. */
export const normalizeCode = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
export interface BatchRow {
  id: string; event_id: string; name: string; price: number; total: number; sold: number; reserved: number;
  sales_start: string; sales_end: string; status: "active" | "paused" | "closed"; position: number;
  ticket_type: string | null;
}

export type PublicBatchStatus = "active" | "paused" | "closed" | "soldout" | "upcoming";

/** Status público do lote, como o frontend espera. */
export function batchStatus(b: BatchRow, at = new Date().toISOString()) {
  if (b.sold + b.reserved >= b.total) return "soldout" as const;
  if (b.status !== "active") return b.status;
  if (at < b.sales_start) return "paused" as const;
  if (at > b.sales_end) return "closed" as const;
  return "active" as const;
}

/**
 * Categoria do lote (Pista, Feminino, VIP…): o tipo de ingresso; se o lote não tem tipo, o nome sem o
 * "1º lote"/"2º lote" (assim "1º Lote" e "2º Lote" são a mesma categoria e "VIP" é outra).
 */
export function categoryOf(b: Pick<BatchRow, "ticket_type" | "name">) {
  const t = b.ticket_type?.trim();
  if (t) return t.toLowerCase();
  const rest = b.name.toLowerCase().replace(/\d+\s*[ºo°ª]?\s*lote/g, "").replace(/\blote\b/g, "").replace(/[—–\-·|:()]/g, " ").replace(/\s+/g, " ").trim();
  return rest || "lote";
}

/**
 * Virada automática de lote: dentro da mesma categoria, na ordem de cadastro, um lote só abre
 * depois que todos os anteriores esgotaram ou encerraram. Os seguintes ficam "upcoming" (em breve).
 */
export function batchStatuses(batches: BatchRow[], at = new Date().toISOString()) {
  const result = new Map<string, PublicBatchStatus>();
  const blocked = new Set<string>();
  for (const b of [...batches].sort((x, y) => x.position - y.position)) {
    const base = batchStatus(b, at);
    const group = categoryOf(b);
    const st: PublicBatchStatus = blocked.has(group) && (base === "active" || base === "paused") ? "upcoming" : base;
    result.set(b.id, st);
    if (base !== "soldout" && base !== "closed") blocked.add(group);
  }
  return result;
}

export function toBatch(b: BatchRow, status: PublicBatchStatus = batchStatus(b)) {
  return {
    id: b.id, name: b.name, price: b.price, total: b.total, ticketType: b.ticket_type, category: categoryOf(b),
    // "sold" público inclui reservas em andamento: é o que não está mais disponível.
    sold: b.sold + b.reserved,
    salesStart: b.sales_start, salesEnd: b.sales_end, status,
  };
}

export const batchesOf = (eventId: string) =>
  all<BatchRow>("SELECT * FROM batches WHERE event_id = ? ORDER BY position, price", eventId);

function summary(e: EventRow, batches: BatchRow[]) {
  const statuses = batchStatuses(batches);
  const open = batches.filter((b) => statuses.get(b.id) === "active");
  const left = open.reduce((s, b) => s + b.total - b.sold - b.reserved, 0);
  const cap = open.reduce((s, b) => s + b.total, 0);
  const availability = left <= 0 ? "soldout" : left / cap <= 0.15 ? "few_left" : "available";
  const prices = (open.length ? open : batches).map((b) => b.price);
  return {
    id: e.id, slug: e.slug, title: e.title, category: e.category, coverUrl: e.cover_url, startsAt: e.starts_at,
    venue: e.venue, city: e.city, priceFrom: prices.length ? Math.min(...prices) : 0,
    availability: availability as "available" | "few_left" | "soldout",
    featured: !!e.featured,
    popularity: batches.reduce((s, b) => s + b.sold, 0),
  };
}

export async function toEventSummary(e: EventRow) {
  return summary(e, await batchesOf(e.id));
}

/** Vários eventos de uma vez: uma única consulta de lotes (em vez de uma por evento). */
export async function toEventSummaries(events: EventRow[]) {
  if (!events.length) return [];
  const rows = await all<BatchRow>(
    `SELECT * FROM batches WHERE event_id IN (${events.map(() => "?").join(",")}) ORDER BY position, price`, ...events.map((e) => e.id));
  const byEvent = new Map<string, BatchRow[]>();
  for (const b of rows) byEvent.set(b.event_id, [...(byEvent.get(b.event_id) ?? []), b]);
  return events.map((e) => summary(e, byEvent.get(e.id) ?? []));
}

export async function toEventDetail(e: EventRow) {
  const batches = await batchesOf(e.id);
  const org = await one<{ id: string; name: string }>("SELECT id, name FROM users WHERE id = ?", e.organizer_id);
  return {
    ...summary(e, batches),
    description: e.description,
    address: e.address,
    organizer: org ?? { id: e.organizer_id, name: "" },
    importantInfo: JSON.parse(e.important_info) as string[],
    transferPolicy: { maxTransfers: e.max_transfers, deadline: e.transfer_deadline ?? e.starts_at },
    refundPolicy: e.refund_policy,
    maxTicketsPerCpf: e.max_per_cpf,
    status: e.status,
    visibility: e.visibility ?? "public",
    // Só avisa que existe senha; a senha em si nunca sai para o público.
    requiresAccessCode: !!e.access_code,
    batches: (() => { const st = batchStatuses(batches); return batches.map((b) => toBatch(b, st.get(b.id))); })(),
  };
}

export const findEvent = (idOrSlug: string) =>
  one<EventRow>("SELECT * FROM events WHERE id = ? OR slug = ?", idOrSlug, idOrSlug);
