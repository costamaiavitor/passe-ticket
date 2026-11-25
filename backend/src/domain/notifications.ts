// Celulares cadastrados para notificação e o lembrete diário "sua festa é hoje".
import { all, now, one, run, tx } from "../db.js";
import { fmtDateTime } from "../lib/email.js";
import { sendPush } from "../lib/push.js";

/** O app manda o token do celular depois que a pessoa entra e libera as notificações. */
export async function registerDevice(userId: string, token: string, platform: "android" | "ios") {
  const t = now();
  // Mesmo celular com outra conta: o aparelho passa a ser da conta que entrou por último.
  await run(
    `INSERT INTO push_devices (token, user_id, platform, created_at, last_seen_at) VALUES (?,?,?,?,?)
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, last_seen_at = EXCLUDED.last_seen_at`,
    token, userId, platform, t, t);
}

/** Ao sair da conta, o celular para de receber as notificações dela. */
export async function unregisterDevice(userId: string, token: string) {
  await run("DELETE FROM push_devices WHERE token = ? AND user_id = ?", token, userId);
}

/** Data (AAAA-MM-DD) no horário de Fortaleza (UTC−3, sem horário de verão). */
const fortalezaDay = (ms: number) => new Date(ms - 3 * 3600_000).toISOString().slice(0, 10);

/**
 * Roda uma vez por dia (Vercel, de manhã em Fortaleza): avisa quem tem ingresso para evento que
 * começa nas próximas 24 horas. Cada evento é lembrado uma vez só, mesmo se rodar de novo.
 */
export async function sendEventReminders(at = new Date()) {
  const from = at.toISOString(), to = new Date(at.getTime() + 24 * 3600_000).toISOString();
  const events = await all<{ id: string; title: string; starts_at: string; venue: string }>(
    `SELECT e.id, e.title, e.starts_at, e.venue FROM events e
      WHERE e.status = 'published' AND e.starts_at > ? AND e.starts_at <= ?
        AND NOT EXISTS (SELECT 1 FROM event_reminders r WHERE r.event_id = e.id)`, from, to);
  let people = 0;
  for (const ev of events) {
    // Marca antes de enviar: se duas execuções rodarem juntas, só uma manda.
    const claimed = await tx(async () => {
      if (await one("SELECT 1 FROM event_reminders WHERE event_id = ? FOR UPDATE", ev.id)) return false;
      await run("INSERT INTO event_reminders (event_id, sent_at) VALUES (?, ?) ON CONFLICT DO NOTHING", ev.id, now());
      return true;
    });
    if (!claimed) continue;
    const owners = await all<{ owner_id: string }>("SELECT DISTINCT owner_id FROM tickets WHERE event_id = ? AND status = 'valid'", ev.id);
    const sameDay = fortalezaDay(Date.parse(ev.starts_at)) === fortalezaDay(at.getTime());
    for (const o of owners) {
      await sendPush(o.owner_id, {
        title: sameDay ? `É hoje: ${ev.title}` : `Falta pouco: ${ev.title}`,
        body: `${fmtDateTime(ev.starts_at)} · ${ev.venue}. Seu ingresso está no app e abre até sem internet.`,
        url: "/ingressos",
      });
      people++;
    }
  }
  return { events: events.length, people };
}
