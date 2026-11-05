// Área do organizador: criar eventos, acompanhar vendas e montar a equipe da portaria.
import { queryOptions } from "@tanstack/react-query";
import type { AuthUser, EventCategory, OrganizerEvent, StaffMember } from "@/types";
import { http, setAccessToken, USE_MOCKS } from "./http";
import { setSession } from "./session";

const needsBackend = () => {
  if (USE_MOCKS) throw new Error("A área do organizador só funciona com o backend conectado.");
};

/** Libera a conta para criar eventos (o servidor devolve uma sessão nova com o papel de organizador). */
export async function becomeOrganizer() {
  needsBackend();
  const r = await http<{ accessToken: string; user: AuthUser }>("/auth/become-organizer", { method: "POST" });
  setAccessToken(r.accessToken);
  setSession({ user: r.user, ready: true });
  return r.user;
}

export interface NewBatch {
  name: string;
  price: number; // centavos
  total: number;
  salesStart: string; // ISO
  salesEnd: string; // ISO
}

export interface NewEvent {
  title: string;
  category: EventCategory;
  coverUrl: string;
  startsAt: string; // ISO
  venue: string;
  city: string;
  address: string;
  description: string;
  importantInfo: string[];
  maxTicketsPerCpf: number;
  maxTransfers: number;
  batches: NewBatch[];
}

export async function createEvent(data: NewEvent) {
  needsBackend();
  return http<OrganizerEvent>("/organizer/events", { method: "POST", body: JSON.stringify({ ...data, status: "published" }) });
}

async function listMyEvents(): Promise<OrganizerEvent[]> {
  needsBackend();
  return http<OrganizerEvent[]>("/organizer/events");
}
export const myEventsQuery = () => queryOptions({ queryKey: ["organizer-events"], queryFn: listMyEvents });

// ---- Equipe da portaria ----
const staffPath = (eventId: string) => `/organizer/events/${encodeURIComponent(eventId)}/staff`;

export const staffQuery = (eventId: string) =>
  queryOptions({ queryKey: ["organizer-staff", eventId], queryFn: () => http<StaffMember[]>(staffPath(eventId)) });

export const addStaff = (eventId: string, email: string) =>
  http<{ ok: true }>(staffPath(eventId), { method: "POST", body: JSON.stringify({ email }) });

export const removeStaff = (eventId: string, userId: string) =>
  http<null>(`${staffPath(eventId)}/${encodeURIComponent(userId)}`, { method: "DELETE" });
