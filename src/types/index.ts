export type EventCategory = "shows" | "festas" | "conferencias" | "teatro" | "esportes";

export interface Batch {
  id: string;
  name: string;
  price: number; // em centavos
  total: number;
  sold: number;
  salesStart: string;
  salesEnd: string;
  status: "active" | "paused" | "closed" | "soldout" | "upcoming";
  /** Tipo de ingresso (Pista, Camarote…): lotes do mesmo tipo abrem um depois do outro. */
  ticketType?: string | null;
}

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  coverUrl: string;
  startsAt: string;
  venue: string;
  city: string;
  priceFrom: number;
  availability: "available" | "few_left" | "soldout";
  featured?: boolean;
  popularity: number;
}

export interface EventDetail extends EventSummary {
  description: string;
  address: string;
  organizer: { id: string; name: string };
  importantInfo: string[];
  transferPolicy: { maxTransfers: number; deadline: string };
  refundPolicy: string;
  maxTicketsPerCpf?: number;
  batches: Batch[];
}

export interface EventFilters {
  q?: string | undefined;
  city?: string | undefined;
  category?: EventCategory | undefined;
  date?: string | undefined;
  maxPrice?: number | undefined;
  onlyAvailable?: boolean | undefined;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: Array<"buyer" | "organizer" | "staff" | "admin">;
}

export interface Holder { name: string; cpf: string }

export interface Order {
  id: string;
  status: "pending" | "paid" | "expired" | "cancelled" | "refund_required";
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  eventStartsAt: string;
  batchId: string;
  batchName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  fee: number;
  total: number;
  payment: { method: "pix"; pixCode: string; pixQrBase64?: string; ticketUrl?: string } | null;
  paymentProvider: string;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
}

export interface Ticket {
  id: string;
  orderId: string;
  status: "valid" | "used";
  holderName: string;
  holderCpf: string;
  event: { id: string; slug: string; title: string; startsAt: string; venue: string; city: string; coverUrl: string };
  batchName: string;
  /** Conteúdo do QR Code. null quando o ingresso já foi utilizado. */
  qrPayload: string | null;
  checkedInAt: string | null;
  transfers: number;
  canTransfer: boolean;
}

export type ScanResultCode = "ok" | "already_used" | "invalid" | "revoked" | "wrong_event" | "not_paid" | "cancelled";

export interface ScanResult {
  result: ScanResultCode;
  ok: boolean;
  message: string;
  scannedAt: string;
  checkedInAt?: string | null;
  ticket: { id: string; holderName: string; holderCpf: string; batchName: string; eventTitle: string } | null;
}

export interface ScanEvent { id: string; title: string; startsAt: string; venue: string }

export interface CheckinStats {
  totalTickets: number;
  checkedIn: number;
  remaining: number;
  recent: Array<{ result: ScanResultCode; at: string; holder_name: string | null }>;
}

// ---- Área do organizador ----
export interface OrganizerEvent extends EventDetail {
  status: "draft" | "published" | "cancelled";
  maxTicketsPerCpf: number;
  stats: { ticketsSold: number; revenue: number; checkedIn: number };
}

export interface StaffMember { id: string; name: string; email: string }
