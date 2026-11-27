// BooTickets instalado pelo navegador (PWA): ícone na tela de início, tela cheia, ingresso sem internet
// e notificações, sem passar pelas lojas. No app das lojas (Capacitor) nada disto roda.
import { isNativeApp } from "@/lib/native-app";

const isBrowser = () => typeof window !== "undefined" && typeof navigator !== "undefined";

/** Aberto como app instalado (ícone na tela de início), e não numa aba do navegador. */
export function isStandalone() {
  if (!isBrowser()) return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export const isIos = () => isBrowser() && /iPhone|iPad|iPod/.test(navigator.userAgent);
export const isAndroid = () => isBrowser() && /Android/.test(navigator.userAgent);

/** Registra o service worker (página sem internet e notificações). Só no site publicado. */
export async function registerServiceWorker() {
  if (!isBrowser() || isNativeApp() || !("serviceWorker" in navigator) || !import.meta.env.PROD) return null;
  try { return await navigator.serviceWorker.register("/sw.js", { scope: "/" }); } catch { return null; }
}

// ---------------- Instalar ----------------
interface InstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }
let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

/** Guarda o convite de instalação do Chrome/Android para mostrar no nosso botão. Chamado uma vez ao abrir o site. */
export function listenForInstall() {
  if (!isBrowser()) return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => { deferred = null; listeners.forEach((l) => l()); });
}
export const onInstallChange = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const canPromptInstall = () => !!deferred;

/** Abre o convite de instalação do navegador (Android/Chrome/Edge). */
export async function promptInstall() {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  listeners.forEach((l) => l());
  return outcome === "accepted";
}

// ---------------- Notificações ----------------
export type WebPushState = "unsupported" | "needs-install" | "denied" | "on" | "off";
const ENDPOINT_KEY = "bt-push-endpoint";

export async function webPushState(): Promise<WebPushState> {
  if (!isBrowser() || isNativeApp()) return "unsupported";
  // No iPhone, a Apple só libera notificação para o site instalado na tela de início (iOS 16.4+).
  if (isIos() && !isStandalone()) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    return sub && Notification.permission === "granted" ? "on" : "off";
  } catch {
    return "unsupported"; // alguns navegadores (ex.: Safari no computador) recusam ler a inscrição
  }
}

function keyBytes(base64url: string) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Pede permissão e cadastra este aparelho para receber notificações (precisa de um toque da pessoa). */
export async function enableWebPush(): Promise<WebPushState> {
  const { getAppStatus, registerPushDevice } = await import("@/services/app");
  const status = await getAppStatus();
  if (!status.push.web || !status.vapidPublicKey) throw new Error("As notificações ainda não foram ligadas no servidor.");
  const reg = (await navigator.serviceWorker.getRegistration("/")) ?? (await registerServiceWorker());
  if (!reg) throw new Error("Este navegador não permite notificações.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "off";
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(status.vapidPublicKey) }));
  await registerPushDevice(JSON.stringify(sub.toJSON()), "web");
  try { localStorage.setItem(ENDPOINT_KEY, JSON.stringify(sub.toJSON())); } catch { /* sem armazenamento: tudo bem */ }
  return "on";
}

/** Ao sair da conta: este aparelho para de receber as notificações dela. */
export async function disableWebPush() {
  if (!isBrowser() || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    const token = sub ? JSON.stringify(sub.toJSON()) : localStorage.getItem(ENDPOINT_KEY);
    if (token) {
      const { removePushDevice } = await import("@/services/app");
      await removePushDevice(token).catch(() => undefined);
    }
    await sub?.unsubscribe();
    localStorage.removeItem(ENDPOINT_KEY);
  } catch { /* nada a fazer */ }
}
