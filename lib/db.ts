import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

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
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  admin_notes TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cod','gcash')),
  gcash_ref TEXT,
  shipping_fee INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','confirmed','shipped','delivered','cancelled')),
  created_at TEXT NOT NULL,
  request_id TEXT,
  fulfilment TEXT NOT NULL DEFAULT 'delivery' CHECK (fulfilment IN ('delivery','pickup')),
  preferred_date TEXT
);
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
const g = globalThis as unknown as { __db?: DatabaseSync; __dbPath?: string };

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
  const variantColumns = db.prepare("PRAGMA table_info(variants)").all().map((c) => c.name);
  if (!variantColumns.includes("price")) db.exec("ALTER TABLE variants ADD COLUMN price INTEGER CHECK (price IS NULL OR price >= 0)");
  // The first costing release stored lines in recipe_items; recipe_lines replaced it.
  db.exec("DROP TABLE IF EXISTS recipe_items");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_request ON orders(request_id) WHERE request_id IS NOT NULL");
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
