import type { AuthUser } from "@/types";
import { http, onSessionExpired, refreshAccessToken, setAccessToken, USE_MOCKS } from "./http";
import { getSession, setSession } from "./session";

interface AuthResponse { accessToken: string; user: AuthUser }

export async function login(email: string, password: string) {
  if (USE_MOCKS) {
    const { mockLogin } = await import("@/mocks/store");
    const user = mockLogin(email);
    setSession({ user, ready: true });
    return user;
  }
  const r = await http<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  setAccessToken(r.accessToken);
  setSession({ user: r.user, ready: true });
  return r.user;
}

export async function register(data: { name: string; email: string; cpf: string; password: string }) {
  if (USE_MOCKS) {
    const { mockLogin } = await import("@/mocks/store");
    const user = mockLogin(data.email, data.name);
    setSession({ user, ready: true });
    return { user };
  }
  const r = await http<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) });
  setAccessToken(r.accessToken);
  setSession({ user: r.user, ready: true });
  return { user: r.user };
}

/** Entrar com Google: a API confere o token do Google e devolve a sessão do Passe. */
export async function loginWithGoogle(credential: string) {
  const r = await http<AuthResponse>("/auth/google", { method: "POST", body: JSON.stringify({ credential }) });
  setAccessToken(r.accessToken);
  setSession({ user: r.user, ready: true });
  return r.user;
}

export async function logout() {
  if (!USE_MOCKS) await http("/auth/logout", { method: "POST" }).catch(() => undefined);
  setAccessToken(null);
  setSession({ user: null, ready: true });
}

/** Restaura a sessão ao abrir o site (cookie httpOnly de refresh). */
export async function restoreSession() {
  if (getSession().ready) return;
  if (USE_MOCKS) {
    const { mockCurrentUser } = await import("@/mocks/store");
    setSession({ user: mockCurrentUser(), ready: true });
    return;
  }
  if (await refreshAccessToken()) {
    const user = await http<AuthUser>("/auth/me").catch(() => null);
    setSession({ user, ready: true });
  } else setSession({ user: null, ready: true });
}

if (typeof window !== "undefined") onSessionExpired(() => setSession({ user: null, ready: true }));
