import { useSyncExternalStore } from "react";
import type { AuthUser } from "@/types";

interface SessionState { user: AuthUser | null; ready: boolean }

let state: SessionState = { user: null, ready: false };
const listeners = new Set<() => void>();
const SERVER_STATE: SessionState = { user: null, ready: false };

export function setSession(next: Partial<SessionState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}
export const getSession = () => state;

export function useSession() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => SERVER_STATE,
  );
}

export const hasRole = (u: AuthUser | null, ...roles: AuthUser["roles"]) =>
  !!u && u.roles.some((r) => r === "admin" || roles.includes(r));
