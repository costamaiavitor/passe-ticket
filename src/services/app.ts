// Notificações do app e "Adicionar à Carteira" (Apple Wallet / Google Wallet).
import { queryOptions } from "@tanstack/react-query";
import { http, USE_MOCKS } from "./http";

export interface AppStatus { push: { android: boolean; ios: boolean }; wallet: { apple: boolean; google: boolean } }
const OFF: AppStatus = { push: { android: false, ios: false }, wallet: { apple: false, google: false } };

export const getAppStatus = () => (USE_MOCKS ? Promise.resolve(OFF) : http<AppStatus>("/app/status").catch(() => OFF));
export const appStatusQuery = () => queryOptions({ queryKey: ["app-status"], queryFn: getAppStatus, staleTime: 10 * 60_000 });

export const registerPushDevice = (token: string, platform: "android" | "ios") =>
  http<null>("/app/devices", { method: "POST", body: JSON.stringify({ token, platform }) });
export const removePushDevice = (token: string) =>
  http<null>("/app/devices/remove", { method: "POST", body: JSON.stringify({ token }) });

export const walletLink = (ticketId: string, kind: "apple" | "google") =>
  http<{ url: string }>(`/app/tickets/${encodeURIComponent(ticketId)}/wallet/${kind}`);
