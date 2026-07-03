import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT
);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crm_id TEXT UNIQUE,
  name TEXT,
  phone TEXT,
  phone_raw TEXT,
  branch TEXT,
  lead_ref TEXT,
  tags TEXT,
  created_at TEXT,
  source_file TEXT,
  imported_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uniq_hash TEXT UNIQUE,
  branch TEXT,
  client TEXT,
  phone TEXT,
  phone_raw TEXT,
  alta_date TEXT,
  birthday TEXT,
  last_sale_date TEXT,
  amount REAL,
  invoices INTEGER,
  source_file TEXT,
  imported_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sales_phone ON sales(phone);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(last_sale_date);

CREATE TABLE IF NOT EXISTS meta_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uniq_hash TEXT UNIQUE,
  campaign TEXT,
  adset TEXT,
  age TEXT,
  sex TEXT,
  reach INTEGER,
  impressions INTEGER,
  result_type TEXT,
  results INTEGER,
  spend REAL,
  cost_per_result REAL,
  start_date TEXT,
  end_date TEXT,
  level TEXT,
  source_file TEXT,
  imported_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_meta_level ON meta_rows(level);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS import_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file TEXT,
  sheet TEXT,
  kind TEXT,
  inserted INTEGER,
  duplicates INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

declare global {
  // eslint-disable-next-line no-var
  var __grunDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (globalThis.__grunDb) return globalThis.__grunDb;
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "grun.db"));
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  ensureAdmin(db);
  globalThis.__grunDb = db;
  return db;
}

function ensureAdmin(db: Database.Database) {
  const email = process.env.ADMIN_EMAIL || "admin@grun.com";
  const password = process.env.ADMIN_PASSWORD || "grun2026";
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (!exists) {
    db.prepare(
      "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)"
    ).run(email, bcrypt.hashSync(password, 10), "Administrador");
  }
}
