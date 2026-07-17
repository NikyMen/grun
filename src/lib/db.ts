import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT
);

CREATE TABLE IF NOT EXISTS blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
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

CREATE TABLE IF NOT EXISTS uploaded_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block_id INTEGER,
  name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  size INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_files_block ON uploaded_files(block_id);

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
  migrateBlocks(db);
  migrateFileLink(db);
  ensureAdmin(db);
  globalThis.__grunDb = db;
  return db;
}

// Los datos son fríos: cada carga de archivos forma un bloque con nombre propio.
// Las tablas viejas no tenían block_id, así que se agrega y lo ya cargado
// queda agrupado en un bloque histórico.
function migrateBlocks(db: Database.Database) {
  const tables = ["contacts", "sales", "meta_rows", "import_log"];
  const pending = tables.filter((t) => {
    const cols = db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[];
    return !cols.some((c) => c.name === "block_id");
  });
  if (pending.length === 0) return;

  for (const t of pending) {
    db.exec(`ALTER TABLE ${t} ADD COLUMN block_id INTEGER`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_${t}_block ON ${t}(block_id)`);
  }

  const orphans = tables.some(
    (t) => (db.prepare(`SELECT COUNT(*) n FROM ${t} WHERE block_id IS NULL`).get() as { n: number }).n > 0
  );
  if (!orphans) return;

  const legacy = db.prepare("INSERT INTO blocks (name) VALUES (?)").run("Carga inicial");
  for (const t of tables) {
    db.prepare(`UPDATE ${t} SET block_id = ? WHERE block_id IS NULL`).run(legacy.lastInsertRowid);
  }
}

// El historial apunta al Excel original. Las importaciones viejas se hicieron
// antes de que se guardaran los archivos, así que quedan con file_id en NULL.
function migrateFileLink(db: Database.Database) {
  const cols = db.prepare("PRAGMA table_info(import_log)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "file_id")) {
    db.exec("ALTER TABLE import_log ADD COLUMN file_id INTEGER");
  }
}

// Los Excel originales se guardan tal cual se subieron, para poder verlos y
// descargarlos después desde el historial.
export function uploadsDir(): string {
  const dir = path.join(process.cwd(), "data", "uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function saveUploadedFile(blockId: number, name: string, buffer: Buffer): number {
  const db = getDb();
  // El nombre en disco lo genera la app: el del archivo del usuario nunca toca la ruta.
  const ext = /\.xlsx$/i.test(name) ? ".xlsx" : ".xls";
  const storedName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  fs.writeFileSync(path.join(uploadsDir(), storedName), buffer);
  const r = db
    .prepare("INSERT INTO uploaded_files (block_id, name, stored_name, size) VALUES (?, ?, ?, ?)")
    .run(blockId, name, storedName, buffer.length);
  return Number(r.lastInsertRowid);
}

export function getUploadedFile(id: number) {
  return getDb().prepare("SELECT * FROM uploaded_files WHERE id = ?").get(id) as
    | { id: number; block_id: number; name: string; stored_name: string; size: number }
    | undefined;
}

export function createBlock(name: string): number {
  const db = getDb();
  const clean = name.trim() || `Bloque ${new Date().toISOString().slice(0, 10)}`;
  const r = db.prepare("INSERT INTO blocks (name) VALUES (?)").run(clean);
  return Number(r.lastInsertRowid);
}

// El bloque que recibe las cargas manuales sueltas si no se eligió ninguno.
export function defaultManualBlock(): number {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM blocks WHERE name = ?").get("Carga manual") as
    | { id: number }
    | undefined;
  return existing ? existing.id : createBlock("Carga manual");
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
