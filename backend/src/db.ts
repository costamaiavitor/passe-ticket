import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { config } from "./config.ts";

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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  ticket_id TEXT,
  staff_id TEXT NOT NULL,
  result TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS checkins_event ON checkins(event_id, at);
`;

export function openDatabase(path = config.databasePath): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  return db;
}

export let db = openDatabase(config.isTest ? ":memory:" : config.databasePath);

/** Só para testes: troca o banco por um novo em memória. */
export function resetDatabase() {
  db.close();
  db = openDatabase(":memory:");
}

type Params = SQLInputValue[];
export const one = <T>(sql: string, ...p: Params) => db.prepare(sql).get(...p) as T | undefined;
export const all = <T>(sql: string, ...p: Params) => db.prepare(sql).all(...p) as T[];
export const run = (sql: string, ...p: Params) => db.prepare(sql).run(...p);

/** Transação síncrona com bloqueio de escrita imediato (evita overbooking). */
export function tx<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export const now = () => new Date().toISOString();
