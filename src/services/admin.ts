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

/** Situação da conta Mercado Pago de cada organizador (split só vale para quem está conectado). */
export interface MpAccountRow {
  id: string; name: string; email: string; events: number;
  status: "connected" | "disconnected" | "problem" | "never";
  mpUserId: string | null; connectedAt: string | null; disconnectedAt: string | null;
  /** Vendas pagas direto na conta do organizador x pela conta do BooTickets (depois de conectar). */
  salesDirect: number; salesPlatform: number;
  /** Último erro do Mercado Pago (renovação do acesso ou venda que não pôde ser dividida). */
  lastError: string | null;
}
export const mpAccountsQuery = () => queryOptions({ queryKey: ["admin-mp"], queryFn: () => http<MpAccountRow[]>("/admin/mp-accounts"), refetchInterval: 30_000 });

export const allEventsQuery = () => queryOptions({ queryKey: ["admin-events"], queryFn: () => http<AdminEvent[]>("/admin/events") });

export const payoutsQuery = () => queryOptions({ queryKey: ["admin-payouts"], queryFn: () => http<PayoutRow[]>("/admin/payouts") });

export const registerPayout = (d: { eventId: string; amount: number; note: string }) =>
  http<{ ok: true }>("/admin/payouts", { method: "POST", body: JSON.stringify(d) });
