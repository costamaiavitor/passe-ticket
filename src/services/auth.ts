import type { AuthUser } from "@/types";
import { http, setAccessToken } from "./http";

interface AuthResponse { accessToken: string; user: AuthUser }

// Endpoints provisórios — ajustar conforme a especificação OpenAPI do backend.
export async function login(email: string, password: string) {
  const r = await http<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  setAccessToken(r.accessToken);
  return r.user;
}

export async function register(data: { name: string; email: string; cpf: string; password: string }) {
  return http<{ user: AuthUser }>("/auth/register", { method: "POST", body: JSON.stringify(data) });
}
