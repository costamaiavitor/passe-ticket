// Ponte com o app das lojas (App Store e Google Play). O app abre este mesmo site; dentro dele existe
// window.Capacitor. No navegador comum nada disto roda.
import type { Ticket } from "@/types";

interface Listener { remove(): Promise<void> }
interface PushPlugin {
  checkPermissions(): Promise<{ receive: string }>;
  requestPermissions(): Promise<{ receive: string }>;
  register(): Promise<void>;
  addListener(event: "registration", cb: (t: { value: string }) => void): Promise<Listener>;
  addListener(event: "registrationError", cb: (e: unknown) => void): Promise<Listener>;
  addListener(event: "pushNotificationActionPerformed", cb: (a: { notification: { data?: Record<string, string> } }) => void): Promise<Listener>;
}
interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: {
    Preferences?: { set(o: { key: string; value: string }): Promise<void>; remove(o: { key: string }): Promise<void> };
    PushNotifications?: PushPlugin;
    Browser?: { open(o: { url: string; presentationStyle?: "fullscreen" | "popover" }): Promise<void> };
  };
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
  const QRCode = (await import("qrcode")).default;
  const upcoming = tickets.filter((t) => Date.parse(t.event.startsAt) > Date.now() - 24 * 3600_000);
  const list = await Promise.all(upcoming.map(async (t) => ({
    id: t.id, title: t.event.title, startsAt: t.event.startsAt, venue: t.event.venue, city: t.event.city,
    holderName: t.holderName, batchName: t.batchName,
    qr: t.qrPayload ? await QRCode.toDataURL(t.qrPayload, { width: 480, margin: 1, errorCorrectionLevel: "M" }) : null,
  })));
  const value = JSON.stringify({ savedAt: new Date().toISOString(), tickets: list });
  // App das lojas: armazenamento do app. Site e app instalado pelo navegador: armazenamento do navegador,
  // lido pela página /offline.html quando não há internet.
  if (prefs) await prefs.set({ key: OFFLINE_KEY, value });
  else try { localStorage.setItem(OFFLINE_KEY, value); } catch { /* sem espaço ou modo privado */ }
}

/** Ao sair da conta, apaga os ingressos guardados no celular. */
export async function clearTicketsOffline() {
  await bridge()?.Plugins?.Preferences?.remove({ key: OFFLINE_KEY });
  try { localStorage.removeItem(OFFLINE_KEY); } catch { /* nada */ }
}

// ---------------- Notificações ----------------
let pushToken: string | null = null;
let pushStarted = false;

/**
 * Pede para mandar notificações (uma vez, depois que a pessoa entrou na conta) e cadastra o celular
 * na API. Só roda no app e só se o servidor estiver com as chaves (sem elas o Android fecharia o app).
 */
export async function setupPush() {
  const c = bridge();
  const push = c?.Plugins?.PushNotifications;
  const platform = c?.getPlatform?.();
  if (!push || pushStarted || (platform !== "android" && platform !== "ios")) return;
  pushStarted = true;
  const { getAppStatus, registerPushDevice } = await import("@/services/app");
  if (!(await getAppStatus()).push[platform]) return;
  let perm = await push.checkPermissions();
  if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") perm = await push.requestPermissions();
  if (perm.receive !== "granted") return;
  await push.addListener("registration", ({ value }) => {
    pushToken = value;
    void registerPushDevice(value, platform).catch(() => undefined);
  });
  // Tocou na notificação: abre a página dela (Meus ingressos, na maioria).
  await push.addListener("pushNotificationActionPerformed", (a) => {
    const url = a.notification.data?.["url"];
    if (url && url.startsWith("/")) window.location.assign(url);
  });
  await push.register();
}

/** Ao sair da conta, o celular deixa de receber as notificações dela. */
export async function stopPush() {
  if (!pushToken) return;
  const { removePushDevice } = await import("@/services/app");
  await removePushDevice(pushToken).catch(() => undefined);
  pushToken = null;
  pushStarted = false;
}

// ---------------- Carteira ----------------
/** Abre o link da Carteira: no app, numa janela do sistema (que sabe abrir a Carteira); no site, direto. */
export async function openWalletLink(url: string) {
  const browser = bridge()?.Plugins?.Browser;
  if (browser) return browser.open({ url, presentationStyle: "popover" });
  window.location.assign(url);
}

/** Qual Carteira mostrar: iPhone/Mac → Apple; Android → Google; computador comum → as duas. */
export function walletKinds(): ("apple" | "google")[] {
  const p = bridge()?.getPlatform?.();
  if (p === "ios") return ["apple"];
  if (p === "android") return ["google"];
  if (typeof navigator === "undefined") return [];
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return ["apple"];
  if (/Android/.test(ua)) return ["google"];
  return ["apple", "google"];
}
