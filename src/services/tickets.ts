import { queryOptions } from "@tanstack/react-query";
import type { CheckinStats, IncomingTransfer, ScanEvent, ScanResult, Ticket } from "@/types";
import { http, USE_MOCKS } from "./http";

const mocks = () => import("@/mocks/store");

async function listTickets(): Promise<Ticket[]> {
  if (USE_MOCKS) return (await mocks()).mockTickets();
  return http<Ticket[]>("/tickets");
}

// ---- Transferência com aceite ----
const needsBackend = () => { if (USE_MOCKS) throw new Error("Transferência disponível apenas com o backend conectado."); };

/** Oferece o ingresso para o CPF de outra pessoa; ela precisa aceitar no site. */
export async function offerTransfer(id: string, cpf: string) {
  needsBackend();
  return http<{ id: string }>(`/tickets/${encodeURIComponent(id)}/transfer`, { method: "POST", body: JSON.stringify({ cpf }) });
}
export async function cancelTransfer(id: string) {
  needsBackend();
  return http<null>(`/tickets/${encodeURIComponent(id)}/transfer`, { method: "DELETE" });
}
export const incomingTransfersQuery = () =>
  queryOptions({
    queryKey: ["incoming-transfers"],
    queryFn: async () => (USE_MOCKS ? { needsCpf: false, transfers: [] as IncomingTransfer[] }
      : http<{ needsCpf: boolean; transfers: IncomingTransfer[] }>("/tickets/transfers/incoming")),
    refetchInterval: 20_000,
  });
export const acceptTransfer = (transferId: string) =>
  http<{ ticketId: string }>(`/tickets/transfers/${encodeURIComponent(transferId)}/accept`, { method: "POST" });
export const declineTransfer = (transferId: string) =>
  http<{ ok: true }>(`/tickets/transfers/${encodeURIComponent(transferId)}/decline`, { method: "POST" });
/** Informa o CPF da conta (para quem entrou com Google poder receber transferências). */
export const setMyCpf = (cpf: string) => http<{ ok: true }>("/auth/me/cpf", { method: "PUT", body: JSON.stringify({ cpf }) });

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
