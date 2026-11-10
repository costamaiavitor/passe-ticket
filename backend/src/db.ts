// Banco de dados: Postgres.
// - Produção (Vercel + Neon): DATABASE_URL aponta para o Postgres.
// - Desenvolvimento e testes: sem DATABASE_URL, usa o PGlite (Postgres embutido, sem instalar nada).
import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync } from "node:fs";
import { config } from "./config.js";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  cpf TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  roles TEXT NOT NULL DEFAULT '["buyer"]',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  organizer_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  cover_url TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  important_info TEXT NOT NULL DEFAULT '[]',
  refund_policy TEXT NOT NULL DEFAULT '',
  max_transfers INTEGER NOT NULL DEFAULT 1,
  transfer_deadline TEXT,
  max_per_cpf INTEGER NOT NULL DEFAULT 2,
  featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','cancelled')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  total INTEGER NOT NULL CHECK (total >= 0),
  sold INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  sales_start TEXT NOT NULL,
  sales_end TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','closed')),
  position INTEGER NOT NULL DEFAULT 0,
  CHECK (sold + reserved <= total)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  event_id TEXT NOT NULL REFERENCES events(id),
  batch_id TEXT NOT NULL REFERENCES batches(id),
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  fee INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','paid','expired','cancelled','refund_required')),
  payment_provider TEXT NOT NULL,
  payment_id TEXT,
  payment_data TEXT NOT NULL DEFAULT '{}',
  expires_at TEXT NOT NULL,
  paid_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_pending ON orders(status, expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS orders_payment ON orders(payment_provider, payment_id) WHERE payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  event_id TEXT NOT NULL REFERENCES events(id),
  batch_id TEXT NOT NULL REFERENCES batches(id),
  owner_id TEXT NOT NULL REFERENCES users(id),
  holder_name TEXT NOT NULL,
  holder_cpf TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','valid','used','cancelled')),
  qr_version INTEGER NOT NULL DEFAULT 1,
  transfers INTEGER NOT NULL DEFAULT 0,
  checked_in_at TEXT,
  checked_in_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS tickets_owner ON tickets(owner_id);
CREATE INDEX IF NOT EXISTS tickets_event_cpf ON tickets(event_id, holder_cpf);

CREATE TABLE IF NOT EXISTS event_staff (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (event_id, user_id)
);

-- Registro de todas as leituras na portaria (auditoria).
CREATE TABLE IF NOT EXISTS checkins (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  ticket_id TEXT,
  staff_id TEXT NOT NULL,
  result TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS checkins_event ON checkins(event_id, at);

-- Login com Google (contas antigas ganham a coluna automaticamente).
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_google ON users(google_sub) WHERE google_sub IS NOT NULL;

-- Tipo de ingresso (Pista, Camarote…): lotes do mesmo tipo abrem um depois do outro.
ALTER TABLE batches ADD COLUMN IF NOT EXISTS ticket_type TEXT;

-- Pagamentos com cartão (cada tentativa) e qual pagamento quitou o pedido.
CREATE TABLE IF NOT EXISTS order_payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  provider TEXT NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  status_detail TEXT NOT NULL DEFAULT '',
  installments INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS order_payments_order ON order_payments(order_id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_payment_id TEXT;
-- Novo status "refunded" (estorno/contestação). Troca a regra antiga uma única vez.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_v2') THEN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE orders ADD CONSTRAINT orders_status_v2
      CHECK (status IN ('pending','paid','expired','cancelled','refund_required','refunded'));
  END IF;
END $$;

-- Recuperação de senha (guarda só o hash do link enviado por e-mail).
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

-- Dados para o organizador receber os repasses.
ALTER TABLE users ADD COLUMN IF NOT EXISTS payout_pix_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payout_holder TEXT;

-- Repasses feitos aos organizadores (registrados pelo admin).
CREATE TABLE IF NOT EXISTS organizer_payouts (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  note TEXT NOT NULL DEFAULT '',
  paid_at TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS organizer_payouts_event ON organizer_payouts(event_id);

-- Transferências de ingresso aguardando o aceite de quem recebe (identificado pelo CPF).
CREATE TABLE IF NOT EXISTS ticket_transfers (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL REFERENCES users(id),
  to_cpf TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','accepted','declined','cancelled')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  accepted_by TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS ticket_transfers_to ON ticket_transfers(to_cpf, status);
CREATE UNIQUE INDEX IF NOT EXISTS ticket_transfers_one_pending ON ticket_transfers(ticket_id) WHERE status = 'pending';

-- Fotos de capa enviadas pelos organizadores (base64, já reduzidas no celular).
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  mime TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Aprovação de eventos: status "review" (em análise) e motivo de recusa.
ALTER TABLE events ADD COLUMN IF NOT EXISTS review_note TEXT NOT NULL DEFAULT '';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_status_v2') THEN
    ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
    ALTER TABLE events ADD CONSTRAINT events_status_v2 CHECK (status IN ('draft','review','published','rejected','cancelled'));
  END IF;
END $$;

-- Evento privado (só com o link) e palavra-senha para comprar ('' = sem senha).
ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';
ALTER TABLE events ADD COLUMN IF NOT EXISTS access_code TEXT NOT NULL DEFAULT '';

-- Cupons de desconto (percentual ou valor fixo por ingresso). max_uses conta ingressos; NULL = sem limite.
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('percent','fixed')),
  value INTEGER NOT NULL CHECK (value > 0),
  max_uses INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE (event_id, code)
);

-- Pedidos: cupom usado, desconto aplicado e tipo (venda normal ou cortesia dada pelo organizador).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id TEXT REFERENCES coupons(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'sale';
`;

type Param = string | number | boolean | null;
interface Result { rows: Record<string, unknown>[]; rowCount: number }
type Query = (text: string, params: Param[]) => Promise<Result>;
interface Driver {
  query: Query;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (q: Query) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

// COUNT/SUM do Postgres vêm como bigint/numeric (texto); a API trabalha com number.
const toNumber = (v: string) => Number(v);

async function pgDriver(url: string): Promise<Driver> {
  const { default: pg } = await import("pg");
  pg.types.setTypeParser(20, toNumber);
  pg.types.setTypeParser(1700, toNumber);
  const pool = new pg.Pool({
    // sslmode=require já era tratado como verify-full; deixar explícito tira o aviso do driver.
    connectionString: url.replace(/sslmode=(require|prefer|verify-ca)/, "sslmode=verify-full"),
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });
  // O Neon derruba conexões paradas quando "dorme". Sem este handler, o erro derrubaria o processo inteiro.
  pool.on("error", (e) => console.error("Postgres: conexão ociosa encerrada:", e.message));
  const query: Query = async (text, params) => {
    const r = await pool.query(text, params);
    return { rows: r.rows, rowCount: r.rowCount ?? 0 };
  };
  return {
    query,
    exec: async (sql) => { await pool.query(sql); },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const r = await fn(async (text, params) => {
          const x = await client.query(text, params);
          return { rows: x.rows, rowCount: x.rowCount ?? 0 };
        });
        await client.query("COMMIT");
        return r;
      } catch (e) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw e;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

async function pgliteDriver(dataDir?: string): Promise<Driver> {
  const { PGlite } = await import("@electric-sql/pglite");
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const db = await PGlite.create(dataDir, { parsers: { 20: toNumber, 1700: toNumber } });
  const wrap = (r: { rows: unknown[]; affectedRows?: number }): Result =>
    ({ rows: r.rows as Record<string, unknown>[], rowCount: r.affectedRows ?? r.rows.length });
  return {
    query: async (text, params) => wrap(await db.query(text, params)),
    exec: async (sql) => { await db.exec(sql); },
    transaction: (fn) => db.transaction((t) => fn(async (text, params) => wrap(await t.query(text, params)))),
    close: () => db.close(),
  };
}

async function connect(): Promise<Driver> {
  const d = config.databaseUrl
    ? await pgDriver(config.databaseUrl)
    : await pgliteDriver(config.isTest ? undefined : config.localDataDir);
  await d.exec(SCHEMA);
  return d;
}

// Conecta na primeira consulta. Se falhar (banco acordando, rede), a próxima consulta tenta de novo.
let driver: Promise<Driver> | null = null;
function getDriver(): Promise<Driver> {
  driver ??= connect().catch((e) => { driver = null; throw e; });
  return driver;
}

/** Fecha a conexão (scripts como o seed precisam disso para terminar). */
export async function closeDatabase() {
  if (driver) await (await driver).close();
  driver = null;
}

/** Só para testes: troca o banco por um novo, vazio. */
export async function resetDatabase() {
  if (driver) await (await driver).close();
  driver = null;
  await getDriver();
}

/** Converte os "?" das consultas para $1, $2... (ignora "?" dentro de strings). */
function toPg(sql: string) {
  let n = 0, out = "", inStr = false;
  for (const ch of sql) {
    if (ch === "'") inStr = !inStr;
    out += ch === "?" && !inStr ? `$${++n}` : ch;
  }
  return out;
}

const txQuery = new AsyncLocalStorage<Query>();
async function q(sql: string, params: Param[]) {
  const inTx = txQuery.getStore();
  const text = toPg(sql);
  if (inTx) return inTx(text, params);
  try {
    return await (await getDriver()).query(text, params);
  } catch (e) {
    // Fora de transação, uma queda de conexão é repetida uma vez (o pool abre outra conexão).
    if (!isConnectionError(e)) throw e;
    return (await getDriver()).query(text, params);
  }
}

export const one = async <T>(sql: string, ...p: Param[]) => (await q(sql, p)).rows[0] as T | undefined;
export const all = async <T>(sql: string, ...p: Param[]) => (await q(sql, p)).rows as T[];
export const run = async (sql: string, ...p: Param[]) => ({ changes: (await q(sql, p)).rowCount });

/** Transação: tudo dentro de fn usa a mesma conexão. Use SELECT ... FOR UPDATE para travar linhas disputadas. */
export async function tx<T>(fn: () => Promise<T>): Promise<T> {
  if (txQuery.getStore()) return fn(); // já dentro de uma transação
  return (await getDriver()).transaction((query) => txQuery.run(query, fn));
}

export const now = () => new Date().toISOString();

export function isConnectionError(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  const code = (e as { code?: string } | null)?.code ?? "";
  return /Connection terminated|timeout|ECONNRESET|socket hang up/i.test(msg) || ["57P01", "08006", "08003", "08P01"].includes(code);
}
