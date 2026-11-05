// Popula o banco com usuários de demonstração e os mesmos eventos do mock do frontend.
// Uso: npm run seed   (use --reset para apagar o banco antes)
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { config } from "./config.js";

// --reset só apaga o banco local (PGlite); nunca mexe no Postgres de produção.
if (process.argv.includes("--reset") && !config.databaseUrl) rmSync(config.localDataDir, { recursive: true, force: true });

const { closeDatabase, now, one, run, tx } = await import("./db.js");
const { hashPassword } = await import("./lib/crypto.js");

const PASSWORD = "passe1234";
const users = [
  { name: "Admin Passe", email: "admin@passe.dev", cpf: "52998224725", roles: ["buyer", "admin"] },
  { name: "Noite Produções", email: "produtor@passe.dev", cpf: "11144477735", roles: ["buyer", "organizer"] },
  { name: "Equipe Portaria", email: "portaria@passe.dev", cpf: "39053344705", roles: ["buyer", "staff"] },
  { name: "Cliente Teste", email: "cliente@passe.dev", cpf: "15350946056", roles: ["buyer"] },
];

const hash = await hashPassword(PASSWORD);
const ids: Record<string, string> = {};
for (const u of users) {
  const existing = await one<{ id: string }>("SELECT id FROM users WHERE email = ?", u.email);
  ids[u.email] = existing?.id ?? randomUUID();
  if (!existing)
    await run("INSERT INTO users (id, name, email, cpf, password_hash, roles, created_at) VALUES (?,?,?,?,?,?,?)",
      ids[u.email]!, u.name, u.email, u.cpf, hash, JSON.stringify(u.roles), now());
}

const img = (f: string) => `${config.publicUrl}/static/images/${f}`;
const base = {
  importantInfo: ["Classificação 18 anos", "Documento com foto obrigatório", "Proibida a entrada de bebidas"],
  refundPolicy: "Reembolso integral até 7 dias após a compra, desde que faltem mais de 48h para o evento.",
  description: "Uma noite inesquecível com produção de nível internacional, som imersivo e iluminação de ponta.",
};
const events = [
  { slug: "festival-aurora", title: "Festival Aurora 2026", category: "shows", cover: "event-concert.jpg", venue: "Arena Norte", city: "Fortaleza", startsAt: "2026-12-12T21:00:00-03:00", featured: 1 },
  { slug: "dev-summit-ne", title: "Dev Summit Nordeste", category: "conferencias", cover: "event-conference.jpg", venue: "Centro de Eventos", city: "Recife", startsAt: "2026-11-28T09:00:00-03:00", featured: 1 },
  { slug: "pulse-night", title: "Pulse — Techno Night", category: "festas", cover: "event-club.jpg", venue: "Galpão 12", city: "Fortaleza", startsAt: "2026-11-21T23:00:00-03:00", featured: 0 },
  { slug: "riso-solto", title: "Riso Solto — Stand-up", category: "teatro", cover: "event-theater.jpg", venue: "Teatro José de Alencar", city: "Fortaleza", startsAt: "2026-11-15T20:00:00-03:00", featured: 0 },
  { slug: "orbita-live", title: "Órbita Live Sessions", category: "shows", cover: "event-concert.jpg", venue: "Marina Park", city: "Natal", startsAt: "2027-01-10T19:00:00-03:00", featured: 0 },
  { slug: "after-lab", title: "After Lab", category: "festas", cover: "event-club.jpg", venue: "Rooftop 33", city: "Recife", startsAt: "2026-12-05T22:00:00-03:00", featured: 0 },
];

let created = 0;
await tx(async () => {
  for (const e of events) {
    if (await one("SELECT 1 FROM events WHERE slug = ?", e.slug)) continue;
    const id = e.slug;
    const starts = new Date(e.startsAt);
    await run(
      `INSERT INTO events (id, slug, organizer_id, title, category, cover_url, starts_at, venue, city, address, description,
        important_info, refund_policy, max_transfers, transfer_deadline, max_per_cpf, featured, status, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,2,?, 'published', ?)`,
      id, e.slug, ids["produtor@passe.dev"]!, e.title, e.category, img(e.cover), starts.toISOString(), e.venue, e.city,
      "Av. Beira Mar, 1000", base.description, JSON.stringify(base.importantInfo), base.refundPolicy,
      new Date(starts.getTime() - 24 * 3600_000).toISOString(), e.featured, now(),
    );
    const start = new Date().toISOString();
    const end = new Date(starts.getTime() - 3600_000).toISOString();
    const batches: [string, number, number][] = [["1º Lote", 12000, 300], ["2º Lote", 15000, 400], ["VIP", 32000, 80]];
    for (const [i, [name, price, total]] of batches.entries())
      await run("INSERT INTO batches (id, event_id, name, price, total, sales_start, sales_end, status, position) VALUES (?,?,?,?,?,?,?, 'active', ?)",
        `${id}-b${i + 1}`, id, name, price, total, start, end, i);
    // Equipe da portaria em todos os eventos de demonstração
    await run("INSERT INTO event_staff (event_id, user_id, created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING", id, ids["portaria@passe.dev"]!, now());
    created++;
  }
});

console.log(`Seed ok: ${created} evento(s) criados.`);
console.log(`Contas (senha "${PASSWORD}"): ${users.map((u) => u.email).join(", ")}`);
await closeDatabase();
