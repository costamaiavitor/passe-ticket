// Confere o token de "Entrar com Google" (Google Identity Services) direto com as chaves públicas do Google.
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config.js";

const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export interface GoogleProfile { sub: string; email: string; name: string }

async function verifyIdToken(idToken: string): Promise<GoogleProfile | null> {
  if (!config.googleClientId) return null;
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_KEYS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: config.googleClientId,
    });
    const email = typeof payload["email"] === "string" ? payload["email"].toLowerCase() : "";
    // Só aceita e-mail confirmado pelo Google: é ele que liga o login a uma conta já existente.
    if (!payload.sub || !email || payload["email_verified"] !== true) return null;
    const name = typeof payload["name"] === "string" && payload["name"].trim() ? payload["name"].trim() : email.split("@")[0]!;
    return { sub: payload.sub, email, name: name.slice(0, 120) };
  } catch {
    return null;
  }
}

/** Objeto mutável para os testes poderem trocar a verificação por uma falsa. */
export const google = { verifyIdToken };
