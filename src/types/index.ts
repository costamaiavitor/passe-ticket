export type EventCategory = "shows" | "festas" | "conferencias" | "teatro" | "esportes";

export interface Batch {
  id: string;
  name: string;
  price: number; // em centavos
  total: number;
  sold: number;
  salesStart: string;
  salesEnd: string;
  status: "active" | "paused" | "closed" | "soldout";
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
  batches: Batch[];
}

export interface EventFilters {
  q?: string;
  city?: string;
  category?: EventCategory;
  date?: string;
  maxPrice?: number;
  onlyAvailable?: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: Array<"buyer" | "organizer" | "staff" | "admin">;
}
