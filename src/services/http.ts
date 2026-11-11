// Camada HTTP central. Base: VITE_API_URL + /api/v1.
const ENV_API = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "");
// Em produção o site e a API ficam no mesmo endereço (Vercel). No navegador usamos sempre o endereço
// da própria página: assim bootickets.com.br, www e o *.vercel.app funcionam sem esbarrar no CORS
// e o cookie de login fica no mesmo domínio do site.
export const API_BASE = ENV_API && import.meta.env.PROD && typeof window !== "undefined" ? window.location.origin : ENV_API;
export const USE_MOCKS = !API_BASE;

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => { accessToken = t; };
type Listener = () => void;
const expiredListeners = new Set<Listener>();
export const onSessionExpired = (l: Listener) => { expiredListeners.add(l); return () => expiredListeners.delete(l); };

let refreshing: Promise<boolean> | null = null;
/** Renova o access token usando o cookie httpOnly de refresh. */
export function refreshAccessToken(): Promise<boolean> {
  refreshing ??= raw<{ accessToken: string }>("/auth/refresh", { method: "POST" })
    .then((r) => { setAccessToken(r.accessToken); return true; })
    .catch(() => { setAccessToken(null); return false; })
    .finally(() => { refreshing = null; });
  return refreshing;
}

async function raw<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE) throw new ApiError(0, "NO_API", "Backend não configurado (defina VITE_API_URL).");
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Erro de conexão. Verifique sua internet.");
  }
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.code ?? "HTTP_ERROR", body?.message ?? `Erro ${res.status}`);
  }
  return body as T;
}

export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await raw<T>(path, init);
  } catch (e) {
    // Access token expira em 15 min: tenta renovar uma vez e repete a chamada.
    if (e instanceof ApiError && e.status === 401 && !path.startsWith("/auth/")) {
      if (await refreshAccessToken()) return raw<T>(path, init);
      expiredListeners.forEach((l) => l());
    }
    throw e;
  }
}
