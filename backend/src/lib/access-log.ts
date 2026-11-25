// Registro de acessos à aplicação (Marco Civil da Internet, Lei 12.965/2014, art. 15): data, hora e IP
// de cada entrada na conta e das ações importantes, guardados em sigilo por no mínimo 6 meses.
// Serve de prova em caso de fraude, contestação de compra ou ordem judicial. Depois de 13 meses é apagado
// (LGPD: não guardar além do necessário).
import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { now, run } from "../db.js";

export type AccessAction =
  | "login" | "login_google" | "register" | "password_reset" | "logout" | "account_deleted"
  | "become_organizer" | "organizer_terms" | "refund_request";

export const requestProof = (req: Request) => ({
  ip: (req.ip ?? "").slice(0, 64),
  userAgent: (req.get("user-agent") ?? "").slice(0, 300),
});

/** Nunca derruba a operação principal: se falhar, só avisa no log. */
export async function logAccess(req: Request, userId: string | null, action: AccessAction) {
  const p = requestProof(req);
  try {
    await run("INSERT INTO access_logs (id, user_id, action, ip, user_agent, created_at) VALUES (?,?,?,?,?,?)",
      randomUUID(), userId, action, p.ip, p.userAgent, now());
    // Limpeza de vez em quando (sem precisar de tarefa agendada).
    if (Math.random() < 0.01)
      await run("DELETE FROM access_logs WHERE created_at < ?", new Date(Date.now() - 400 * 86400_000).toISOString());
  } catch (e) {
    console.error("Falha ao registrar acesso:", e);
  }
}
