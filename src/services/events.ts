import { queryOptions } from "@tanstack/react-query";
import type { EventDetail, EventFilters, EventSummary } from "@/types";
import { ApiError, http, USE_MOCKS } from "./http";

async function listEvents(f: EventFilters): Promise<EventSummary[]> {
  if (!USE_MOCKS) {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
    return http<EventSummary[]>(`/events?${qs}`);
  }
  const { mockEvents } = await import("@/mocks/events");
  const q = f.q?.toLowerCase();
  return mockEvents.filter((e) =>
    (!q || e.title.toLowerCase().includes(q) || e.city.toLowerCase().includes(q)) &&
    (!f.city || e.city === f.city) &&
    (!f.category || e.category === f.category) &&
    (!f.date || e.startsAt.slice(0, 10) >= f.date) &&
    (!f.maxPrice || e.priceFrom <= f.maxPrice) &&
    (!f.onlyAvailable || e.availability !== "soldout"),
  );
}

async function getEvent(id: string): Promise<EventDetail> {
  if (!USE_MOCKS) return http<EventDetail>(`/events/${encodeURIComponent(id)}`);
  const { mockEvents } = await import("@/mocks/events");
  const e = mockEvents.find((x) => x.id === id);
  if (!e) throw new ApiError(404, "NOT_FOUND", "Evento não encontrado");
  return e;
}

export const eventsQuery = (f: EventFilters = {}) =>
  queryOptions({ queryKey: ["events", f], queryFn: () => listEvents(f) });
export const eventQuery = (id: string) =>
  queryOptions({ queryKey: ["event", id], queryFn: () => getEvent(id) });

/** Confere a palavra-senha do evento antes de liberar a compra. */
export const checkAccessCode = (eventId: string, code: string) =>
  http<{ ok: true }>(`/events/${encodeURIComponent(eventId)}/access-code`, { method: "POST", body: JSON.stringify({ code }) });

/** Prévia do cupom: devolve o tipo e o valor do desconto (a compra recalcula no servidor). */
export const previewCoupon = (eventId: string, code: string, quantity: number) =>
  http<{ code: string; kind: "percent" | "fixed"; value: number }>(`/events/${encodeURIComponent(eventId)}/coupon`, { method: "POST", body: JSON.stringify({ code, quantity }) });
