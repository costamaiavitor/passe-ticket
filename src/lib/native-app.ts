// Ponte com o app das lojas (App Store e Google Play). O app abre este mesmo site; dentro dele existe
// window.Capacitor. No navegador comum nada disto roda.
import type { Ticket } from "@/types";

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: { Preferences?: { set(o: { key: string; value: string }): Promise<void>; remove(o: { key: string }): Promise<void> } };
}

function bridge(): CapacitorBridge | null {
  if (typeof window === "undefined") return null;
  const c = (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor;
  return c?.isNativePlatform?.() ? c : null;
}

/** O site está aberto dentro do app (e não no navegador). */
export const isNativeApp = () => !!bridge();

/** Marca a página para o CSS do app (espaço do entalhe do iPhone etc.). Chamado depois da hidratação. */
export function markNativeApp() {
  const c = bridge();
  if (!c) return;
  document.documentElement.dataset["app"] = c.getPlatform?.() ?? "native";
}

/** Chave lida pela página offline do app (app/www/offline.html). */
const OFFLINE_KEY = "bt-offline-tickets";

/**
 * Guarda os ingressos no celular para abrirem sem internet na porta da festa: só o necessário para
 * entrar (evento, titular, lote e o QR já pronto como imagem). O CPF não é guardado.
 */
export async function saveTicketsOffline(tickets: Ticket[]) {
  const prefs = bridge()?.Plugins?.Preferences;
  if (!prefs) return;
  const QRCode = (await import("qrcode")).default;
  const upcoming = tickets.filter((t) => Date.parse(t.event.startsAt) > Date.now() - 24 * 3600_000);
  const list = await Promise.all(upcoming.map(async (t) => ({
    id: t.id, title: t.event.title, startsAt: t.event.startsAt, venue: t.event.venue, city: t.event.city,
    holderName: t.holderName, batchName: t.batchName,
    qr: t.qrPayload ? await QRCode.toDataURL(t.qrPayload, { width: 480, margin: 1, errorCorrectionLevel: "M" }) : null,
  })));
  await prefs.set({ key: OFFLINE_KEY, value: JSON.stringify({ savedAt: new Date().toISOString(), tickets: list }) });
}

/** Ao sair da conta, apaga os ingressos guardados no celular. */
export async function clearTicketsOffline() {
  await bridge()?.Plugins?.Preferences?.remove({ key: OFFLINE_KEY });
}
