import { beforeEach, expect, test } from "vitest";
import { getDb, tx } from "@/lib/db";
import { freshDb } from "./helpers";

beforeEach(freshDb);

test("schema exists on first open and the database is empty", () => {
  const tables = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all()
    .map((r) => r.name);
  expect(tables).toEqual(expect.arrayContaining(["order_items", "orders", "products", "settings", "variants"]));
  expect(getDb().prepare("SELECT COUNT(*) c FROM products").get()!.c).toBe(0);
});

test("getDb returns the same connection", () => {
  expect(getDb()).toBe(getDb());
});

test("tx rolls back on throw", () => {
  expect(() =>
    tx((db) => {
      db.prepare("INSERT INTO settings (key, value) VALUES ('a', '1')").run();
      throw new Error("boom");
    }),
  ).toThrow("boom");
  expect(getDb().prepare("SELECT COUNT(*) c FROM settings").get()!.c).toBe(0);
});
