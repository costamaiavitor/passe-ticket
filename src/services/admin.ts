// Área do admin do BooTickets: aprovar eventos e registrar repasses aos organizadores.
import { queryOptions } from "@tanstack/react-query";
import type { PayoutRow, ReviewEvent } from "@/types";
import { http } from "./http";

export const reviewEventsQuery = () =>
  queryOptions({ queryKey: ["admin-review"], queryFn: () => http<ReviewEvent[]>("/admin/events/review") });

export const approveEvent = (id: string) =>
  http<{ ok: true }>(`/admin/events/${encodeURIComponent(id)}/approve`, { method: "POST" });

export const rejectEvent = (id: string, reason: string) =>
  http<{ ok: true }>(`/admin/events/${encodeURIComponent(id)}/reject`, { method: "POST", body: JSON.stringify({ reason }) });

export const markRefundedOutside = (eventId: string) =>
  http<{ ok: true; orders: number }>(`/admin/events/${encodeURIComponent(eventId)}/mark-refunded`, { method: "POST" });

export interface AdminEvent {
  id: string; slug: string; title: string; status: string; startsAt: string; city: string; coverUrl: string; visibility: string;
  organizer: { name: string; email: string }; sold: number; revenue: number;
}
/** Apaga de vez um evento cancelado sem pagamento. */
export const purgeEvent = (id: string) => http<{ ok: true }>(`/admin/events/${encodeURIComponent(id)}`, { method: "DELETE" });

export const allEventsQuery = () => queryOptions({ queryKey: ["admin-events"], queryFn: () => http<AdminEvent[]>("/admin/events") });

export const payoutsQuery = () => queryOptions({ queryKey: ["admin-payouts"], queryFn: () => http<PayoutRow[]>("/admin/payouts") });

export const registerPayout = (d: { eventId: string; amount: number; note: string }) =>
  http<{ ok: true }>("/admin/payouts", { method: "POST", body: JSON.stringify(d) });
