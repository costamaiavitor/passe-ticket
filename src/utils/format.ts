export const PLATFORM_FEE_RATE = 0.1;
export const MAX_TICKETS_PER_CPF = 2;

export const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Taxa (centavos) somada ao valor do comprador. Valor definitivo vem do backend. */
export const platformFee = (subtotalCents: number, rate = PLATFORM_FEE_RATE) => Math.round(subtotalCents * rate);

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Fortaleza" });
export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" });

export const categoryLabel: Record<string, string> = {
  shows: "Shows", festas: "Festas", conferencias: "Conferências", teatro: "Teatro", esportes: "Esportes",
};
