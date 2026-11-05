import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { all, now, one, run, tx } from "../db.js";
import { toEventDetail, type BatchRow, type EventRow } from "../domain/events.js";
import { maskCpf } from "../lib/cpf.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { assertEventOwner, parse, requireRole, user } from "../lib/http.js";

export const organizerRouter = Router();
organizerRouter.use(requireRole("organizer"));

const iso = z.string().datetime({ offset: true });
const batchSchema = z.object({
  name: z.string().trim().min(1).max(60),
  price: z.number().int().min(0), // centavos
  total: z.number().int().min(1).max(1_000_000),
  salesStart: iso,
  salesEnd: iso,
  status: z.enum(["active", "paused", "closed"]).default("active"),
});
const eventSchema = z.object({
  title: z.string().trim().min(3).max(140),
  category: z.enum(["shows", "festas", "conferencias", "teatro", "esportes"]),
  coverUrl: z.string().url().or(z.literal("")).default(""),
  startsAt: iso,
  venue: z.string().trim().min(2),
  city: z.string().trim().min(2),
  address: z.string().trim().default(""),
  description: z.string().default(""),
  importantInfo: z.array(z.string()).default([]),
  refundPolicy: z.string().default(""),
  maxTransfers: z.number().int().min(0).max(10).default(1),
  transferDeadline: iso.nullable().default(null),
  maxTicketsPerCpf: z.number().int().min(1).max(20).default(2),
  status: z.enum(["draft", "published"]).default("published"),
  batches: z.array(batchSchema).default([]),
});

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);

async function insertBatch(eventId: string, b: z.infer<typeof batchSchema>, position: number) {
  if (b.salesEnd <= b.salesStart) throw badRequest("INVALID_DATES", `Lote "${b.name}": fim das vendas antes do início.`);
  const id = randomUUID();
  await run(
    "INSERT INTO batches (id, event_id, name, price, total, sales_start, sales_end, status, position) VALUES (?,?,?,?,?,?,?,?,?)",
    id, eventId, b.name, b.price, b.total, new Date(b.salesStart).toISOString(), new Date(b.salesEnd).toISOString(), b.status, position,
  );
  return id;
}

organizerRouter.get("/events", async (req, res) => {
  const a = user(req);
  const rows = a.roles.includes("admin")
    ? await all<EventRow>("SELECT * FROM events ORDER BY starts_at DESC")
    : await all<EventRow>("SELECT * FROM events WHERE organizer_id = ? ORDER BY starts_at DESC", a.id);
  res.json(await Promise.all(rows.map(async (e) => {
    const s = (await one<{ sold: number; revenue: number; checked: number }>(
      `SELECT
         (SELECT COUNT(*) FROM tickets WHERE event_id = ? AND status IN ('valid','used')) sold,
         (SELECT COALESCE(SUM(subtotal), 0) FROM orders WHERE event_id = ? AND status = 'paid') revenue,
         (SELECT COUNT(*) FROM tickets WHERE event_id = ? AND status = 'used') checked`,
      e.id, e.id, e.id,
    ))!;
    return { ...(await toEventDetail(e)), stats: { ticketsSold: s.sold, revenue: s.revenue, checkedIn: s.checked } };
  })));
});

organizerRouter.post("/events", async (req, res) => {
  const d = parse(eventSchema, req.body);
  const a = user(req);
  const id = randomUUID();
  let slug = slugify(d.title) || "evento";
  if (await one("SELECT 1 FROM events WHERE slug = ?", slug)) slug = `${slug}-${id.slice(0, 6)}`;
  await tx(async () => {
    await run(
      `INSERT INTO events (id, slug, organizer_id, title, category, cover_url, starts_at, venue, city, address, description,
        important_info, refund_policy, max_transfers, transfer_deadline, max_per_cpf, status, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, slug, a.id, d.title, d.category, d.coverUrl, new Date(d.startsAt).toISOString(), d.venue, d.city, d.address, d.description,
      JSON.stringify(d.importantInfo), d.refundPolicy, d.maxTransfers,
      d.transferDeadline ? new Date(d.transferDeadline).toISOString() : null, d.maxTicketsPerCpf, d.status, now(),
    );
    for (const [i, b] of d.batches.entries()) await insertBatch(id, b, i);
  });
  res.status(201).json(await toEventDetail((await one<EventRow>("SELECT * FROM events WHERE id = ?", id))!));
});

organizerRouter.patch("/events/:id", async (req, res) => {
  await assertEventOwner(user(req), req.params.id);
  const d = parse(eventSchema.omit({ batches: true }).partial().extend({ status: z.enum(["draft", "published", "cancelled"]).optional() }), req.body);
  const map: Record<string, [string, (v: never) => unknown]> = {
    title: ["title", (v) => v], category: ["category", (v) => v], coverUrl: ["cover_url", (v) => v],
    startsAt: ["starts_at", (v: string) => new Date(v).toISOString()], venue: ["venue", (v) => v], city: ["city", (v) => v],
    address: ["address", (v) => v], description: ["description", (v) => v], importantInfo: ["important_info", (v) => JSON.stringify(v)],
    refundPolicy: ["refund_policy", (v) => v], maxTransfers: ["max_transfers", (v) => v],
    transferDeadline: ["transfer_deadline", (v: string | null) => (v ? new Date(v).toISOString() : null)],
    maxTicketsPerCpf: ["max_per_cpf", (v) => v], status: ["status", (v) => v],
  };
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  for (const [k, v] of Object.entries(d)) {
    const m = map[k];
    if (!m || v === undefined) continue;
    sets.push(`${m[0]} = ?`);
    vals.push(m[1](v as never) as string | number | null);
  }
  if (sets.length) await run(`UPDATE events SET ${sets.join(", ")} WHERE id = ?`, ...vals, req.params.id);
  res.json(await toEventDetail((await one<EventRow>("SELECT * FROM events WHERE id = ?", req.params.id))!));
});

organizerRouter.post("/events/:id/batches", async (req, res) => {
  await assertEventOwner(user(req), req.params.id);
  const b = parse(batchSchema, req.body);
  const { n } = (await one<{ n: number }>("SELECT COUNT(*) n FROM batches WHERE event_id = ?", req.params.id))!;
  await insertBatch(req.params.id, b, n);
  res.status(201).json(await toEventDetail((await one<EventRow>("SELECT * FROM events WHERE id = ?", req.params.id))!));
});

organizerRouter.patch("/batches/:id", async (req, res) => {
  const b = await one<BatchRow>("SELECT * FROM batches WHERE id = ?", req.params.id);
  if (!b) throw notFound("Lote não encontrado.");
  await assertEventOwner(user(req), b.event_id);
  const d = parse(batchSchema.partial(), req.body);
  if (d.total !== undefined && d.total < b.sold + b.reserved)
    throw conflict("TOTAL_BELOW_SOLD", `Já existem ${b.sold + b.reserved} ingressos vendidos/reservados neste lote.`);
  const next = { ...b, ...{ name: d.name ?? b.name, price: d.price ?? b.price, total: d.total ?? b.total, status: d.status ?? b.status,
    sales_start: d.salesStart ? new Date(d.salesStart).toISOString() : b.sales_start,
    sales_end: d.salesEnd ? new Date(d.salesEnd).toISOString() : b.sales_end } };
  await run("UPDATE batches SET name = ?, price = ?, total = ?, status = ?, sales_start = ?, sales_end = ? WHERE id = ?",
    next.name, next.price, next.total, next.status, next.sales_start, next.sales_end, b.id);
  res.json(await toEventDetail((await one<EventRow>("SELECT * FROM events WHERE id = ?", b.event_id))!));
});

/** Lista de participantes (CPF mascarado). */
organizerRouter.get("/events/:id/tickets", async (req, res) => {
  await assertEventOwner(user(req), req.params.id);
  res.json((await all<{ id: string; holder_name: string; holder_cpf: string; status: string; checked_in_at: string | null; batch: string; email: string }>(
    `SELECT t.id, t.holder_name, t.holder_cpf, t.status, t.checked_in_at, b.name batch, u.email
     FROM tickets t JOIN batches b ON b.id = t.batch_id JOIN users u ON u.id = t.owner_id
     WHERE t.event_id = ? AND t.status IN ('valid','used') ORDER BY t.holder_name`, req.params.id,
  )).map((t) => ({ id: t.id, holderName: t.holder_name, holderCpf: maskCpf(t.holder_cpf), status: t.status, checkedInAt: t.checked_in_at, batchName: t.batch, ownerEmail: t.email })));
});

// ---- Equipe da portaria ----
organizerRouter.get("/events/:id/staff", async (req, res) => {
  await assertEventOwner(user(req), req.params.id);
  res.json(await all("SELECT u.id, u.name, u.email FROM event_staff s JOIN users u ON u.id = s.user_id WHERE s.event_id = ? ORDER BY u.name", req.params.id));
});

organizerRouter.post("/events/:id/staff", async (req, res) => {
  await assertEventOwner(user(req), req.params.id);
  const { email } = parse(z.object({ email: z.string().trim().toLowerCase().email() }), req.body);
  const u = await one<{ id: string; roles: string }>("SELECT id, roles FROM users WHERE email = ?", email);
  if (!u) throw notFound("Não existe conta com esse e-mail. Peça para a pessoa se cadastrar.");
  await tx(async () => {
    await run("INSERT INTO event_staff (event_id, user_id, created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING", req.params.id, u.id, now());
    const roles = new Set(JSON.parse(u.roles) as string[]);
    if (!roles.has("staff")) { roles.add("staff"); await run("UPDATE users SET roles = ? WHERE id = ?", JSON.stringify([...roles]), u.id); }
  });
  res.status(201).json({ ok: true });
});

organizerRouter.delete("/events/:id/staff/:userId", async (req, res) => {
  await assertEventOwner(user(req), req.params.id);
  await run("DELETE FROM event_staff WHERE event_id = ? AND user_id = ?", req.params.id, req.params.userId);
  res.status(204).end();
});
