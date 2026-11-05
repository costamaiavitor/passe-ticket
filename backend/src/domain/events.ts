import { all, one } from "../db.ts";

export interface EventRow {
  id: string; slug: string; organizer_id: string; title: string; category: string; cover_url: string;
  starts_at: string; venue: string; city: string; address: string; description: string; important_info: string;
  refund_policy: string; max_transfers: number; transfer_deadline: string | null; max_per_cpf: number;
  featured: number; status: string; created_at: string;
}
export interface BatchRow {
  id: string; event_id: string; name: string; price: number; total: number; sold: number; reserved: number;
  sales_start: string; sales_end: string; status: "active" | "paused" | "closed"; position: number;
}

/** Status público do lote, como o frontend espera. */
export function batchStatus(b: BatchRow, at = new Date().toISOString()) {
  if (b.sold + b.reserved >= b.total) return "soldout" as const;
  if (b.status !== "active") return b.status;
  if (at < b.sales_start) return "paused" as const;
  if (at > b.sales_end) return "closed" as const;
  return "active" as const;
}

export function toBatch(b: BatchRow) {
  return {
    id: b.id, name: b.name, price: b.price, total: b.total,
    // "sold" público inclui reservas em andamento: é o que não está mais disponível.
    sold: b.sold + b.reserved,
    salesStart: b.sales_start, salesEnd: b.sales_end, status: batchStatus(b),
  };
}

export const batchesOf = (eventId: string) =>
  all<BatchRow>("SELECT * FROM batches WHERE event_id = ? ORDER BY position, price", eventId);

function summary(e: EventRow, batches: BatchRow[]) {
  const open = batches.filter((b) => batchStatus(b) === "active");
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

export function toEventSummary(e: EventRow) {
  return summary(e, batchesOf(e.id));
}

export function toEventDetail(e: EventRow) {
  const batches = batchesOf(e.id);
  const org = one<{ id: string; name: string }>("SELECT id, name FROM users WHERE id = ?", e.organizer_id);
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
    batches: batches.map(toBatch),
  };
}

export const findEvent = (idOrSlug: string) =>
  one<EventRow>("SELECT * FROM events WHERE id = ? OR slug = ?", idOrSlug, idOrSlug);
