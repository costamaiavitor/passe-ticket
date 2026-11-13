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
  /** Categoria (tipo, ou o nome sem "1º lote"): só um lote por categoria fica à venda por vez. */
  category?: string;
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
  status?: "draft" | "review" | "published" | "rejected" | "cancelled";
  /** "unlisted" = privado: só abre com o link. */
  visibility?: "public" | "unlisted";
  /** Pede palavra-senha para comprar (a senha em si nunca vem para o público). */
  requiresAccessCode?: boolean;
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
  status: "pending" | "paid" | "expired" | "cancelled" | "refund_required" | "refunded";
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  eventStartsAt: string;
  batchId: string;
  batchName: string;
  quantity: number;
  unitPrice: number;
  /** Carrinho: um item por lote (pedidos de um lote só têm um item). */
  items?: { batchId: string; batchName: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  /** Desconto do cupom (o total já vem com ele). */
  discount?: number;
  couponCode?: string | null;
  fee: number;
  total: number;
  payment: { method: "pix"; pixCode: string; pixQrBase64?: string; ticketUrl?: string } | null;
  paymentProvider: string;
  /** Pagamento no cartão em análise pelo Mercado Pago. */
  cardPending?: boolean;
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
  /** Transferência oferecida e ainda não aceita (o QR continua valendo até o aceite). */
  pendingTransfer?: { id: string; toCpf: string; createdAt: string } | null;
}

/** Convite de transferência recebido (Meus ingressos). */
export interface IncomingTransfer {
  id: string;
  fromName: string;
  createdAt: string;
  batchName: string;
  event: { id: string; slug: string; title: string; startsAt: string; venue: string; city: string; coverUrl: string };
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
export type EventStatus = "draft" | "review" | "published" | "rejected" | "cancelled";

export interface OrganizerEvent extends EventDetail {
  status: EventStatus;
  maxTicketsPerCpf: number;
  reviewNote?: string;
  /** Palavra-senha para comprar ('' = sem senha). Só o organizador vê. */
  accessCode?: string;
  /** owner = dono do evento; co = co-organizador (não remove o evento nem escolhe organizadores). */
  myRole?: "owner" | "co";
  /** revenue = valor dos ingressos vendidos (o que o organizador recebe); paidOut = já repassado. */
  stats: {
    ticketsSold: number; revenue: number; checkedIn: number; paidOut: number; toReceive: number;
    buyers?: number; awaitingPayment?: number; courtesies?: number;
    /** Vendas que caíram direto na conta Mercado Pago conectada do organizador (split). */
    receivedDirect?: number;
  };
}

/** Painel de um evento (organizador). */
export interface EventPanel extends OrganizerEvent {
  salesByBatch: Array<{
    id: string; name: string; price: number; total: number; sold: number; reserved: number; revenue: number;
    status: "active" | "paused" | "closed"; ticketType: string | null; salesStart: string; salesEnd: string;
  }>;
}

/** Um ingresso vendido, na lista de participantes do organizador. */
export interface Attendee {
  id: string; holderName: string; holderCpf: string; status: "valid" | "used"; checkedInAt: string | null;
  batchName: string; price: number; paidAt: string | null; orderId: string;
  buyerName: string; buyerEmail: string; ownerEmail: string; transferred: boolean; courtesy?: boolean;
}

/** Evento aguardando aprovação (tela do admin). */
export interface ReviewEvent extends EventDetail { createdAt: string; organizerEmail: string }

/** Repasse por evento (tela do admin). */
export interface PayoutRow {
  eventId: string; title: string; slug: string; startsAt: string; status: string; tickets: number;
  organizer: { id: string; name: string; email: string; pixKey: string; holder: string };
  revenue: number; platformFees: number; paidOut: number; balance: number;
  /** Vendas que caíram direto na conta Mercado Pago do organizador (não entram no saldo a repassar). */
  direct?: number;
  history: Array<{ id: string; amount: number; note: string; paidAt: string }>;
}

export interface StaffMember { id: string; name: string; email: string }
export interface EventOrganizers { owner: StaffMember; organizers: StaffMember[] }

/** Cupom de desconto do evento. value = % (1–100) ou centavos por ingresso. */
export interface Coupon {
  id: string; code: string; kind: "percent" | "fixed"; value: number; maxUses: number | null; active: boolean; uses: number; createdAt: string;
}

/** Ingresso de cortesia dado pelo organizador. */
export interface Courtesy {
  id: string; holderName: string; holderCpf: string; batchName: string; createdAt: string;
  state: "delivered" | "waiting" | "declined" | "used";
}
