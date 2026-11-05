import { queryOptions } from "@tanstack/react-query";
import type { CheckinStats, ScanEvent, ScanResult, Ticket } from "@/types";
import { http, USE_MOCKS } from "./http";

const mocks = () => import("@/mocks/store");

async function listTickets(): Promise<Ticket[]> {
  if (USE_MOCKS) return (await mocks()).mockTickets();
  return http<Ticket[]>("/tickets");
}

export async function transferTicket(id: string, data: { email: string; holderName: string; holderCpf: string }) {
  if (USE_MOCKS) throw new Error("Transferência disponível apenas com o backend conectado.");
  return http<{ ok: true }>(`/tickets/${encodeURIComponent(id)}/transfer`, { method: "POST", body: JSON.stringify(data) });
}

export const ticketsQuery = () => queryOptions({ queryKey: ["tickets"], queryFn: listTickets });

// ---- Portaria ----
async function listScanEvents(): Promise<ScanEvent[]> {
  if (USE_MOCKS) return (await mocks()).mockScanEvents();
  return http<ScanEvent[]>("/checkin/events");
}

export async function scanTicket(eventId: string, code: string): Promise<ScanResult> {
  if (USE_MOCKS) return (await mocks()).mockScan(eventId, code);
  return http<ScanResult>("/checkin/scan", { method: "POST", body: JSON.stringify({ eventId, code }) });
}

async function getStats(eventId: string): Promise<CheckinStats> {
  if (USE_MOCKS) return (await mocks()).mockStats(eventId);
  return http<CheckinStats>(`/checkin/events/${encodeURIComponent(eventId)}/stats`);
}

export const scanEventsQuery = () => queryOptions({ queryKey: ["scan-events"], queryFn: listScanEvents });
export const checkinStatsQuery = (eventId: string) =>
  queryOptions({ queryKey: ["checkin-stats", eventId], queryFn: () => getStats(eventId), refetchInterval: 10_000 });
