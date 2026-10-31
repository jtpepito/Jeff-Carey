import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/** The orders table. Kept as a function so an older shop's table can be rebuilt with the same definition. */
const ordersTable = (name: string) => `CREATE TABLE IF NOT EXISTS ${name} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  admin_notes TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cod','gcash','bank')),
  gcash_ref TEXT,
  shipping_fee INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','confirmed','shipped','delivered','cancelled')),
  created_at TEXT NOT NULL,
  request_id TEXT,
  fulfilment TEXT NOT NULL DEFAULT 'delivery' CHECK (fulfilment IN ('delivery','pickup')),
  preferred_date TEXT,
  email TEXT NOT NULL DEFAULT '',
  ready_emailed_at TEXT,
  view_token TEXT
);`;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  how_to_use TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price >= 0),
  compare_at INTEGER,
  images TEXT NOT NULL DEFAULT '[]',
  featured INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku TEXT NOT NULL DEFAULT '',
  price INTEGER CHECK (price IS NULL OR price >= 0)
);
${ordersTable("orders")}
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  variant_id INTEGER NOT NULL,
  name_snapshot TEXT NOT NULL,
  price_snapshot INTEGER NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0)
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS payment_proofs (
  order_id INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  data BLOB NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  pack_qty REAL NOT NULL CHECK (pack_qty > 0),
  pack_cost INTEGER NOT NULL CHECK (pack_cost >= 0)
);
CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  yield INTEGER NOT NULL CHECK (yield >= 1),
  labour_minutes INTEGER NOT NULL DEFAULT 0 CHECK (labour_minutes >= 0),
  packaging_cost INTEGER NOT NULL DEFAULT 0 CHECK (packaging_cost >= 0),
  notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  yield_qty REAL NOT NULL CHECK (yield_qty > 0),
  yield_unit TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS component_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  component_id INTEGER NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
  qty REAL NOT NULL CHECK (qty > 0)
);
CREATE TABLE IF NOT EXISTS recipe_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES variants(id) ON DELETE CASCADE,
  ingredient_id INTEGER REFERENCES ingredients(id),
  component_id INTEGER REFERENCES components(id),
  qty REAL NOT NULL CHECK (qty > 0),
  CHECK ((ingredient_id IS NULL) <> (component_id IS NULL))
);
CREATE TABLE IF NOT EXISTS recipe_variants (
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  pieces INTEGER NOT NULL DEFAULT 1 CHECK (pieces >= 1),
  packaging_cost INTEGER CHECK (packaging_cost IS NULL OR packaging_cost >= 0),
  PRIMARY KEY (recipe_id, variant_id)
);
CREATE INDEX IF NOT EXISTS idx_component_items_component ON component_items(component_id);
CREATE INDEX IF NOT EXISTS idx_recipe_lines_recipe ON recipe_lines(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_lines_ingredient ON recipe_lines(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_recipe_lines_component ON recipe_lines(component_id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
`;

// Kept on globalThis so Next's dev-mode module reloads reuse one connection.
const g = globalThis as unknown as { __db?: DatabaseSync; __dbPath?: string; __pendingPath?: string };

function dbPath() {
  return process.env.DB_PATH ?? path.join(process.cwd(), "data", "store.db");
}

export function getDb(): DatabaseSync {
  const file = dbPath();
  if (g.__db && g.__dbPath === file) return g.__db;
  closeDb();
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  g.__pendingPath = file;
  migrate(db);
  g.__db = db;
  g.__dbPath = file;
  return db;
}

/** Brings databases created by an earlier version up to the current schema. */
function migrate(db: DatabaseSync) {
  const orderColumns = db.prepare("PRAGMA table_info(orders)").all().map((c) => c.name);
  if (!orderColumns.includes("request_id")) db.exec("ALTER TABLE orders ADD COLUMN request_id TEXT");
  if (!orderColumns.includes("fulfilment"))
    db.exec("ALTER TABLE orders ADD COLUMN fulfilment TEXT NOT NULL DEFAULT 'delivery' CHECK (fulfilment IN ('delivery','pickup'))");
  if (!orderColumns.includes("preferred_date")) db.exec("ALTER TABLE orders ADD COLUMN preferred_date TEXT");
  if (!orderColumns.includes("email")) db.exec("ALTER TABLE orders ADD COLUMN email TEXT NOT NULL DEFAULT ''");
  if (!orderColumns.includes("ready_emailed_at")) db.exec("ALTER TABLE orders ADD COLUMN ready_emailed_at TEXT");
  if (!orderColumns.includes("view_token")) db.exec("ALTER TABLE orders ADD COLUMN view_token TEXT");
  const variantColumns = db.prepare("PRAGMA table_info(variants)").all().map((c) => c.name);
  if (!variantColumns.includes("price")) db.exec("ALTER TABLE variants ADD COLUMN price INTEGER CHECK (price IS NULL OR price >= 0)");
  // The first costing release stored lines in recipe_items; recipe_lines replaced it.
  db.exec("DROP TABLE IF EXISTS recipe_items");
  allowBankTransfer(db);
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_request ON orders(request_id) WHERE request_id IS NOT NULL");
}

/**
 * Shops created before bank transfer only allow cash or GCash in orders.payment_method. SQLite cannot change
 * that rule in place, so the table is copied into a new one with the current definition. A copy of the whole
 * database is saved next to it first. Foreign keys are switched off while the table is swapped so that dropping
 * the old table does not delete its order items.
 */
function allowBankTransfer(db: DatabaseSync) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'orders'").get() as { sql: string } | undefined;
  if (!row || row.sql.includes("'bank'")) return;
  const file = g.__pendingPath;
  if (file && file !== ":memory:") {
    const backup = file.replace(/\.db$/, "") + `.before-bank-transfer-${new Date().toISOString().slice(0, 10)}.db`;
    if (!fs.existsSync(backup)) db.exec(`VACUUM INTO '${backup.replace(/'/g, "''")}'`);
  }
  const columns = (db.prepare("PRAGMA table_info(orders)").all() as { name: string }[]).map((c) => c.name).join(", ");
  db.exec("PRAGMA foreign_keys = OFF");
  try {
    db.exec("BEGIN");
    db.exec(ordersTable("orders_rebuilt"));
    db.exec(`INSERT INTO orders_rebuilt (${columns}) SELECT ${columns} FROM orders`);
    db.exec("DROP TABLE orders");
    db.exec("ALTER TABLE orders_rebuilt RENAME TO orders");
    db.exec("CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)");
    const broken = db.prepare("PRAGMA foreign_key_check").all();
    if (broken.length) throw new Error(`Order upgrade left ${broken.length} broken links; nothing was changed.`);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }
}

/** How many backups with the same label stay on disk. */
export const KEEP_BACKUPS = 5;

/**
 * Saves a full copy of the database next to it, named with the label and the time, and returns its path.
 * Returns null for an in-memory database (tests), where there is nothing to keep.
 */
export function backupDatabase(label: string, now: Date = new Date()): string | null {
  const file = dbPath();
  if (file === ":memory:") return null;
  const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 23);
  const base = file.replace(/\.db$/, "");
  const backup = `${base}.${label}-${stamp}.db`;
  getDb().exec(`VACUUM INTO '${backup.replace(/'/g, "''")}'`);
  // Backups are full copies, receipts included, and share the disk with the live database: keep only the newest few.
  const dir = path.dirname(backup);
  const prefix = `${path.basename(base)}.${label}-`;
  const older = fs.readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(".db")).sort().reverse().slice(KEEP_BACKUPS);
  for (const f of older) fs.rmSync(path.join(dir, f), { force: true });
  return backup;
}

export function closeDb() {
  g.__db?.close();
  g.__db = undefined;
  g.__dbPath = undefined;
}

/** Runs fn inside BEGIN IMMEDIATE; commits on return, rolls back on throw. */
export function tx<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn(db);
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
