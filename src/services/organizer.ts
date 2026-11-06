// Área do organizador: criar eventos, acompanhar vendas e montar a equipe da portaria.
import { queryOptions } from "@tanstack/react-query";
import type { AuthUser, EventCategory, OrganizerEvent, StaffMember } from "@/types";
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

/** Remove o evento: apaga se não houver vendas; com vendas, cancela e estorna os compradores. */
export const removeEvent = (eventId: string) =>
  http<{ deleted: boolean; refunded: number; refundFailed: number }>(`/organizer/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });

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

// ---- Equipe da portaria ----
const staffPath = (eventId: string) => `/organizer/events/${encodeURIComponent(eventId)}/staff`;

export const staffQuery = (eventId: string) =>
  queryOptions({ queryKey: ["organizer-staff", eventId], queryFn: () => http<StaffMember[]>(staffPath(eventId)) });

export const addStaff = (eventId: string, email: string) =>
  http<{ ok: true }>(staffPath(eventId), { method: "POST", body: JSON.stringify({ email }) });

export const removeStaff = (eventId: string, userId: string) =>
  http<null>(`${staffPath(eventId)}/${encodeURIComponent(userId)}`, { method: "DELETE" });
