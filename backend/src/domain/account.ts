// Exclusão de conta pelo próprio usuário (exigida pela App Store e pelo Google Play, e direito da LGPD).
//
// A conta é ANONIMIZADA, não apagada: nome, e-mail, CPF, chave Pix e acesso somem, mas os pedidos e
// ingressos já pagos continuam no banco (sem como chegar na pessoa), porque são registros de pagamento
// que o BooTickets precisa guardar (fiscal, estornos, contestação no cartão).
//
// Antes de excluir, o que ainda está em andamento precisa ser resolvido (para ninguém perder ingresso
// ou dinheiro sem querer): ingresso para evento futuro, pedido aguardando pagamento, transferência
// em aberto, evento próprio que ainda vai acontecer e repasse a receber.
import { all, now, one, run, tx } from "../db.js";
import { verifyPassword } from "../lib/crypto.js";
import { badRequest, conflict, HttpError, notFound } from "../lib/errors.js";
import { disconnect } from "./mpaccounts.js";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** O que ainda impede excluir a conta, em frases para a tela. Lista vazia = pode excluir. */
export async function deletionBlockers(userId: string): Promise<string[]> {
  const at = now();
  const out: string[] = [];
  const t = (await one<{ n: number }>(
    `SELECT COUNT(*)::int n FROM tickets t JOIN events e ON e.id = t.event_id
      WHERE t.owner_id = ? AND t.status = 'valid' AND e.status <> 'cancelled' AND e.starts_at > ?`, userId, at))!;
  if (Number(t.n)) out.push(`Você tem ${t.n} ingresso(s) para eventos que ainda vão acontecer. Transfira para outra pessoa ou devolva antes de excluir a conta.`);
  const p = (await one<{ n: number }>("SELECT COUNT(*)::int n FROM orders WHERE user_id = ? AND status = 'pending' AND expires_at > ?", userId, at))!;
  if (Number(p.n)) out.push("Você tem um pedido aguardando pagamento. Pague ou cancele o pedido antes.");
  const tr = (await one<{ n: number }>("SELECT COUNT(*)::int n FROM ticket_transfers WHERE from_user_id = ? AND status = 'pending'", userId))!;
  if (Number(tr.n)) out.push("Você tem uma transferência de ingresso em aberto. Cancele ou espere a pessoa aceitar.");
  const ev = await all<{ title: string }>(
    `SELECT title FROM events WHERE organizer_id = ? AND status NOT IN ('cancelled','rejected','draft') AND starts_at > ? ORDER BY starts_at LIMIT 3`, userId, at);
  if (ev.length) out.push(`Você organiza evento(s) que ainda vão acontecer (${ev.map((e) => e.title).join(", ")}). Cancele os eventos ou fale com o BooTickets antes.`);
  // Repasse a receber (vendas que caíram na conta do BooTickets): sem a conta, não teria para onde mandar.
  const owed = (await one<{ v: number }>(
    `SELECT COALESCE(SUM(GREATEST(0,
        COALESCE((SELECT SUM(total - fee) FROM orders o WHERE o.event_id = e.id AND o.status = 'paid' AND o.seller_id IS NULL), 0)
      - COALESCE((SELECT SUM(amount) FROM organizer_payouts p WHERE p.event_id = e.id), 0))), 0)::int v
       FROM events e WHERE e.organizer_id = ?`, userId))!;
  if (Number(owed.v) > 0) out.push(`Você ainda tem ${brl(Number(owed.v))} de repasse a receber. Fale com o BooTickets para receber antes de excluir a conta.`);
  return out;
}

/**
 * Exclui (anonimiza) a conta. Quem tem senha confirma com a senha; quem entrou só com o Google
 * confirma digitando EXCLUIR (o site também pede isso de todos).
 */
export async function deleteAccount(userId: string, input: { password?: string | undefined; confirm: string }) {
  if (input.confirm.trim().toUpperCase() !== "EXCLUIR") throw badRequest("CONFIRM_REQUIRED", "Digite EXCLUIR para confirmar.");
  const u = await one<{ id: string; password_hash: string; deleted_at: string | null }>(
    "SELECT id, password_hash, deleted_at FROM users WHERE id = ?", userId);
  if (!u || u.deleted_at) throw notFound("Conta não encontrada.");
  if (u.password_hash && !(input.password && await verifyPassword(input.password, u.password_hash)))
    throw new HttpError(401, "INVALID_PASSWORD", "Senha incorreta.");
  const blockers = await deletionBlockers(userId);
  if (blockers.length) throw conflict("ACCOUNT_HAS_PENDING", blockers.join(" "));

  await disconnect(userId).catch(() => undefined); // desliga a conta Mercado Pago conectada (se houver)
  await tx(async () => {
    const t = now();
    await run(
      `UPDATE users SET name = 'Conta excluída', email = ?, cpf = '', password_hash = '', google_sub = NULL,
         roles = '[]', payout_pix_key = NULL, payout_holder = NULL, deleted_at = ? WHERE id = ?`,
      `excluida-${userId}@conta-excluida.invalid`, t, userId);
    await run("UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL", t, userId);
    await run("DELETE FROM event_organizers WHERE user_id = ?", userId);
    await run("UPDATE ticket_transfers SET status = 'cancelled', resolved_at = ? WHERE from_user_id = ? AND status = 'pending'", t, userId);
  });
  console.warn(`Conta ${userId} excluída (anonimizada) a pedido do próprio usuário.`);
}
