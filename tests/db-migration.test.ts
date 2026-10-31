import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { closeDb, getDb } from "@/lib/db";

let dir = "";

afterEach(() => {
  closeDb();
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
  process.env.DB_PATH = ":memory:";
});

/** A database as the live shop has it today: orders only allow cash or GCash. */
function oldShop(file: string) {
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, category TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '', how_to_use TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL, compare_at INTEGER,
      images TEXT NOT NULL DEFAULT '[]', featured INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, customer_name TEXT NOT NULL, mobile TEXT NOT NULL,
      province TEXT NOT NULL, city TEXT NOT NULL, address TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', admin_notes TEXT NOT NULL DEFAULT '',
      payment_method TEXT NOT NULL CHECK (payment_method IN ('cod','gcash')), gcash_ref TEXT,
      shipping_fee INTEGER NOT NULL, subtotal INTEGER NOT NULL, total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','confirmed','shipped','delivered','cancelled')),
      created_at TEXT NOT NULL, request_id TEXT,
      fulfilment TEXT NOT NULL DEFAULT 'delivery' CHECK (fulfilment IN ('delivery','pickup')), preferred_date TEXT);
    CREATE TABLE order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL, variant_id INTEGER NOT NULL, name_snapshot TEXT NOT NULL, price_snapshot INTEGER NOT NULL, qty INTEGER NOT NULL);
    INSERT INTO orders (code, customer_name, mobile, province, city, address, payment_method, shipping_fee, subtotal, total, created_at, fulfilment)
      VALUES ('JC-2610-0001', 'Ana', '09171234567', '', '', '', 'cod', 0, 23100, 23100, '2026-10-01T00:00:00.000Z', 'pickup');
    INSERT INTO order_items (order_id, product_id, variant_id, name_snapshot, price_snapshot, qty) VALUES (1, 1, 1, 'OG Cinnamon Rolls — Box of 4', 23100, 1);
  `);
  db.close();
}

test("an existing shop is upgraded to accept bank transfers without losing orders, and a backup is kept", () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "jc-migrate-"));
  const file = path.join(dir, "store.db");
  oldShop(file);
  process.env.DB_PATH = file;
  closeDb();

  const db = getDb();
  const order = db.prepare("SELECT code, payment_method FROM orders").get() as { code: string; payment_method: string };
  expect(order).toEqual({ code: "JC-2610-0001", payment_method: "cod" });
  expect((db.prepare("SELECT COUNT(*) AS c FROM order_items").get() as { c: number }).c).toBe(1);

  db.prepare(
    `INSERT INTO orders (code, customer_name, mobile, province, city, address, payment_method, shipping_fee, subtotal, total, created_at)
     VALUES ('JC-2610-0002', 'Ben', '09171234567', '', '', '', 'bank', 0, 100, 100, '2026-10-02T00:00:00.000Z')`,
  ).run();
  expect((db.prepare("SELECT COUNT(*) AS c FROM orders").get() as { c: number }).c).toBe(2);
  expect(fs.readdirSync(dir).some((f) => f.includes("before-bank-transfer"))).toBe(true);

  // A second start does nothing more.
  closeDb();
  getDb();
  expect(fs.readdirSync(dir).filter((f) => f.includes("before-bank-transfer"))).toHaveLength(1);
});

test("an existing shop gets the view_token column, and its old orders simply have none", () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "jc-migrate-"));
  const file = path.join(dir, "store.db");
  oldShop(file);
  process.env.DB_PATH = file;
  closeDb();

  const columns = (getDb().prepare("PRAGMA table_info(orders)").all() as { name: string }[]).map((c) => c.name);
  expect(columns).toContain("view_token");
  expect(getDb().prepare("SELECT view_token FROM orders").get()).toEqual({ view_token: null });
});
