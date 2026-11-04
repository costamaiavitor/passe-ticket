// Dados mockados — usados somente quando VITE_API_URL não está definido.
import concert from "@/assets/event-concert.jpg";
import conference from "@/assets/event-conference.jpg";
import club from "@/assets/event-club.jpg";
import theater from "@/assets/event-theater.jpg";
import type { EventDetail } from "@/types";

const base = {
  importantInfo: ["Classificação 18 anos", "Documento com foto obrigatório", "Proibida a entrada de bebidas"],
  refundPolicy: "Reembolso integral até 7 dias após a compra, desde que faltem mais de 48h para o evento.",
  organizer: { id: "org_1", name: "Noite Produções" },
};

const mk = (o: Partial<EventDetail> & Pick<EventDetail, "id" | "title">): EventDetail => ({
  slug: o.id,
  category: "shows",
  coverUrl: concert,
  startsAt: "2026-12-12T21:00:00-03:00",
  venue: "Arena Norte",
  city: "Fortaleza",
  address: "Av. Beira Mar, 1000",
  priceFrom: 12000,
  availability: "available",
  popularity: 50,
  description: "Uma noite inesquecível com produção de nível internacional, som imersivo e iluminação de ponta.",
  transferPolicy: { maxTransfers: 1, deadline: "2026-12-11T23:59:00-03:00" },
  batches: [
    { id: "b1", name: "1º Lote", price: 12000, total: 300, sold: 300, salesStart: "2026-09-01", salesEnd: "2026-10-01", status: "soldout" },
    { id: "b2", name: "2º Lote", price: 15000, total: 400, sold: 220, salesStart: "2026-10-01", salesEnd: "2026-12-01", status: "active" },
    { id: "b3", name: "VIP", price: 32000, total: 80, sold: 71, salesStart: "2026-09-01", salesEnd: "2026-12-10", status: "active" },
  ],
  ...base,
  ...o,
});

export const mockEvents: EventDetail[] = [
  mk({ id: "festival-aurora", title: "Festival Aurora 2026", featured: true, popularity: 98, priceFrom: 15000 }),
  mk({ id: "dev-summit-ne", title: "Dev Summit Nordeste", category: "conferencias", coverUrl: conference, venue: "Centro de Eventos", city: "Recife", startsAt: "2026-11-28T09:00:00-03:00", priceFrom: 9000, featured: true, popularity: 80, organizer: { id: "org_2", name: "Tech Hub" } }),
  mk({ id: "pulse-night", title: "Pulse — Techno Night", category: "festas", coverUrl: club, venue: "Galpão 12", city: "Fortaleza", startsAt: "2026-11-21T23:00:00-03:00", priceFrom: 6000, availability: "few_left", popularity: 91 }),
  mk({ id: "riso-solto", title: "Riso Solto — Stand-up", category: "teatro", coverUrl: theater, venue: "Teatro José de Alencar", city: "Fortaleza", startsAt: "2026-11-15T20:00:00-03:00", priceFrom: 5000, popularity: 64 }),
  mk({ id: "orbita-live", title: "Órbita Live Sessions", coverUrl: concert, venue: "Marina Park", city: "Natal", startsAt: "2027-01-10T19:00:00-03:00", priceFrom: 8000, availability: "soldout", popularity: 87 }),
  mk({ id: "after-lab", title: "After Lab", category: "festas", coverUrl: club, venue: "Rooftop 33", city: "Recife", startsAt: "2026-12-05T22:00:00-03:00", priceFrom: 7000, popularity: 72 }),
];
