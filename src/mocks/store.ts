// Backend simulado em memória (+ localStorage) — usado somente quando VITE_API_URL não está definido,
// para o fluxo de compra → QR → portaria funcionar no preview. Regras reais ficam no backend.
import type { AuthUser, CheckinStats, Holder, Order, ScanResult, Ticket } from "@/types";
import { ApiError } from "@/services/http";
import { mockEvents } from "./events";

interface MockTicket { id: string; orderId: string; eventId: string; batchId: string; holder: Holder; status: "pending" | "valid" | "used"; checkedInAt: string | null }
interface State { user: AuthUser | null; orders: Order[]; tickets: MockTicket[]; log: CheckinStats["recent"] }

const KEY = "passe-mock-v1";
const load = (): State => {
  try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s) as State; } catch { /* sem storage */ }
  return { user: null, orders: [], tickets: [], log: [] };
};
let state: State | null = null;
const db = () => (state ??= load());
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db())); } catch { /* ignora */ } };
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function mockLogin(email: string, name = email.split("@")[0] ?? "Você"): AuthUser {
  // No modo demo a conta tem todos os papéis para testar compra e portaria.
  db().user = { id: "mock-user", name, email, roles: ["buyer", "organizer", "staff"] };
  save();
  return db().user!;
}
export const mockCurrentUser = () => db().user;

const me = () => { if (!db().user) throw new ApiError(401, "UNAUTHORIZED", "Faça login para continuar."); return db().user!; };

export function mockCreateOrder(input: { eventId: string; batchId: string; holders: Holder[] }): Order {
  me();
  const ev = mockEvents.find((e) => e.id === input.eventId);
  const b = ev?.batches.find((x) => x.id === input.batchId);
  if (!ev || !b) throw new ApiError(404, "NOT_FOUND", "Lote não encontrado.");
  const subtotal = b.price * input.holders.length;
  const fee = Math.round(subtotal * 0.1);
  const o: Order = {
    id: uid(), status: "pending", eventId: ev.id, eventTitle: ev.title, eventSlug: ev.slug, eventStartsAt: ev.startsAt,
    batchId: b.id, batchName: b.name, quantity: input.holders.length, unitPrice: b.price, subtotal, fee, total: subtotal + fee,
    payment: { method: "pix", pixCode: "00020126PIXSIMULADO-MODO-DEMO" }, paymentProvider: "mock",
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(), paidAt: null, createdAt: new Date().toISOString(),
  };
  db().orders.unshift(o);
  for (const h of input.holders) db().tickets.push({ id: uid(), orderId: o.id, eventId: ev.id, batchId: b.id, holder: h, status: "pending", checkedInAt: null });
  save();
  return o;
}

export function mockGetOrder(id: string): Order {
  const o = db().orders.find((x) => x.id === id);
  if (!o) throw new ApiError(404, "NOT_FOUND", "Pedido não encontrado.");
  return o;
}

export function mockPay(id: string): Order {
  const o = mockGetOrder(id);
  o.status = "paid"; o.paidAt = new Date().toISOString(); o.payment = null;
  db().tickets.filter((t) => t.orderId === id).forEach((t) => (t.status = "valid"));
  save();
  return o;
}

export function mockCancel(id: string): Order {
  const o = mockGetOrder(id);
  o.status = "cancelled";
  db().tickets = db().tickets.filter((t) => t.orderId !== id);
  save();
  return o;
}

const mask = (cpf: string) => `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
const qr = (t: MockTicket) => `PASSE1.${t.id}.1.demo`;

export function mockTickets(): Ticket[] {
  me();
  return db().tickets.filter((t) => t.status !== "pending").map((t) => {
    const ev = mockEvents.find((e) => e.id === t.eventId)!;
    return {
      id: t.id, orderId: t.orderId, status: t.status as Ticket["status"], holderName: t.holder.name, holderCpf: mask(t.holder.cpf),
      event: { id: ev.id, slug: ev.slug, title: ev.title, startsAt: ev.startsAt, venue: ev.venue, city: ev.city, coverUrl: ev.coverUrl },
      batchName: ev.batches.find((b) => b.id === t.batchId)?.name ?? "",
      qrPayload: t.status === "valid" ? qr(t) : null, checkedInAt: t.checkedInAt, transfers: 0, canTransfer: false,
    };
  });
}

export const mockScanEvents = () => (me(), mockEvents.map((e) => ({ id: e.id, title: e.title, startsAt: e.startsAt, venue: e.venue })));

export function mockScan(eventId: string, code: string): ScanResult {
  me();
  const at = new Date().toISOString();
  const t = db().tickets.find((x) => qr(x) === code.trim());
  const ev = t && mockEvents.find((e) => e.id === t.eventId);
  const info = t && ev ? { id: t.id, holderName: t.holder.name, holderCpf: mask(t.holder.cpf), batchName: ev.batches.find((b) => b.id === t.batchId)?.name ?? "", eventTitle: ev.title } : null;
  const out = (result: ScanResult["result"], message: string, extra: Partial<ScanResult> = {}): ScanResult => {
    db().log.unshift({ result, at, holder_name: t?.holder.name ?? null }); save();
    return { result, ok: result === "ok", message, scannedAt: at, ticket: result === "invalid" ? null : info, ...extra };
  };
  if (!t) return out("invalid", "QR Code inválido");
  if (t.eventId !== eventId) return out("wrong_event", "Ingresso de outro evento");
  if (t.status === "used") return out("already_used", "Ingresso já utilizado", { checkedInAt: t.checkedInAt });
  t.status = "used"; t.checkedInAt = at;
  return out("ok", "Entrada liberada", { checkedInAt: at });
}

export function mockStats(eventId: string): CheckinStats {
  const ts = db().tickets.filter((t) => t.eventId === eventId && t.status !== "pending");
  const used = ts.filter((t) => t.status === "used").length;
  return { totalTickets: ts.length, checkedIn: used, remaining: ts.length - used, recent: db().log.slice(0, 20) };
}
