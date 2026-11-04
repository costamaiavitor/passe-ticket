// Camada HTTP central. Base: VITE_API_URL + /api/v1.
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
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

export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
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
  if (res.status === 401) expiredListeners.forEach((l) => l());
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.code ?? "HTTP_ERROR", body?.message ?? `Erro ${res.status}`);
  }
  return body as T;
}
