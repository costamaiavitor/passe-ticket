// Área do organizador: criar eventos, acompanhar vendas e montar a equipe da portaria.
import { queryOptions } from "@tanstack/react-query";
import type { Attendee, AuthUser, Coupon, Courtesy, EventCategory, EventPanel, OrganizerEvent, StaffMember } from "@/types";
import { API_BASE, http, setAccessToken, USE_MOCKS } from "./http";
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
  visibility: "public" | "unlisted";
  accessCode: string;
  batches: NewBatch[];
  coupons?: NewCoupon[];
  /** batchIndex = posição do tipo de ingresso em batches. */
  courtesies?: Array<NewCourtesy & { batchIndex: number }>;
}

export interface NewCoupon { code: string; kind: "percent" | "fixed"; value: number; maxUses?: number | null }
export interface NewCourtesy { name: string; cpf: string; email?: string | undefined }

export async function createEvent(data: NewEvent) {
  needsBackend();
  return http<OrganizerEvent & { courtesyErrors?: string[] }>("/organizer/events", { method: "POST", body: JSON.stringify({ ...data, status: "published" }) });
}

async function listMyEvents(): Promise<OrganizerEvent[]> {
  needsBackend();
  return http<OrganizerEvent[]>("/organizer/events");
}
export const myEventsQuery = () => queryOptions({ queryKey: ["organizer-events"], queryFn: listMyEvents });

// ---- Editar evento e lotes ----
const ev = (id: string) => `/organizer/events/${encodeURIComponent(id)}`;
const lot = (id: string) => `/organizer/batches/${encodeURIComponent(id)}`;
export type EventEdit = Partial<Omit<NewEvent, "batches" | "coupons" | "courtesies">>;
export interface BatchEdit { name?: string; ticketType?: string | null; price?: number; total?: number; status?: "active" | "paused"; salesStart?: string; salesEnd?: string }

export const updateEvent = (id: string, d: EventEdit) => http<OrganizerEvent>(ev(id), { method: "PATCH", body: JSON.stringify(d) });
export const updateBatch = (id: string, d: BatchEdit) => http<OrganizerEvent>(lot(id), { method: "PATCH", body: JSON.stringify(d) });
export const addBatch = (eventId: string, d: NewBatch & { ticketType: string }) =>
  http<OrganizerEvent>(`${ev(eventId)}/batches`, { method: "POST", body: JSON.stringify(d) });
export const deleteBatch = (id: string) => http<OrganizerEvent>(lot(id), { method: "DELETE" });

// ---- Cupons ----
export const couponsQuery = (eventId: string) =>
  queryOptions({ queryKey: ["coupons", eventId], queryFn: () => http<Coupon[]>(`${ev(eventId)}/coupons`) });
export const createCoupon = (eventId: string, d: NewCoupon) => http<Coupon>(`${ev(eventId)}/coupons`, { method: "POST", body: JSON.stringify(d) });
export const updateCoupon = (id: string, d: { active?: boolean; maxUses?: number | null }) =>
  http<Coupon>(`/organizer/coupons/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(d) });
export const deleteCoupon = (id: string) => http<{ deleted: boolean }>(`/organizer/coupons/${encodeURIComponent(id)}`, { method: "DELETE" });

// ---- Cortesias ----
export const courtesiesQuery = (eventId: string) =>
  queryOptions({ queryKey: ["courtesies", eventId], queryFn: () => http<Courtesy[]>(`${ev(eventId)}/courtesies`) });
export const giveCourtesy = (eventId: string, d: NewCourtesy & { batchId: string }) =>
  http<Courtesy>(`${ev(eventId)}/courtesies`, { method: "POST", body: JSON.stringify(d) });
export const revokeCourtesy = (ticketId: string) => http<{ ok: true }>(`/organizer/courtesies/${encodeURIComponent(ticketId)}`, { method: "DELETE" });

/** Remove o evento: apaga se não houver vendas; com vendas, cancela e estorna os compradores. */
export const removeEvent = (eventId: string) =>
  http<{ deleted: boolean; refunded: number; refundFailed: number; errors: string[] }>(`/organizer/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });

// ---- Dados para receber repasses ----
export const payoutInfoQuery = () =>
  queryOptions({ queryKey: ["payout-info"], queryFn: () => http<{ pixKey: string; holder: string }>("/organizer/payout-info") });
export const savePayoutInfo = (d: { pixKey: string; holder: string }) =>
  http<{ pixKey: string; holder: string }>("/organizer/payout-info", { method: "PUT", body: JSON.stringify(d) });

// ---- Foto de capa ----
/** Reduz a foto no próprio aparelho (máx. 1600 px, JPEG) para enviar rápido mesmo no 4G. */
async function shrinkImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("Não foi possível abrir esta foto. Tente outra."); });
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const q of [0.82, 0.7, 0.55]) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length < 1_900_000) return url; // ~1,4 MB depois de decodificado
  }
  throw new Error("A foto é grande demais. Tente outra.");
}

/** Envia a foto e devolve o endereço público dela (usado como capa do evento). */
export async function uploadCover(file: File) {
  needsBackend();
  const dataUrl = await shrinkImage(file);
  const r = await http<{ id: string; url: string }>("/images", { method: "POST", body: JSON.stringify({ dataUrl }) });
  return `${API_BASE}${r.url}`;
}

// ---- Painel do evento ----
export const eventPanelQuery = (id: string) =>
  queryOptions({ queryKey: ["event-panel", id], queryFn: () => http<EventPanel>(`/organizer/events/${encodeURIComponent(id)}`), refetchInterval: 15_000 });
export const attendeesQuery = (id: string) =>
  queryOptions({ queryKey: ["attendees", id], queryFn: () => http<Attendee[]>(`/organizer/events/${encodeURIComponent(id)}/tickets`), refetchInterval: 15_000 });

// ---- Equipe da portaria ----
const staffPath = (eventId: string) => `/organizer/events/${encodeURIComponent(eventId)}/staff`;

export const staffQuery = (eventId: string) =>
  queryOptions({ queryKey: ["organizer-staff", eventId], queryFn: () => http<StaffMember[]>(staffPath(eventId)) });

export const addStaff = (eventId: string, email: string) =>
  http<{ ok: true }>(staffPath(eventId), { method: "POST", body: JSON.stringify({ email }) });

export const removeStaff = (eventId: string, userId: string) =>
  http<null>(`${staffPath(eventId)}/${encodeURIComponent(userId)}`, { method: "DELETE" });
