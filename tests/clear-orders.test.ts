import { beforeEach, expect, test } from "vitest";
import { getDb } from "@/lib/db";
import { changeStatus, clearAllOrders, getOrderByCode, listOrders, placeOrder } from "@/lib/orders";
import { getProductById, updateProduct } from "@/lib/products";
import { ids, NOW, order, product, setupShop, stock } from "./order-fixtures";

beforeEach(setupShop);

const place = (over = {}) => getOrderByCode((placeOrder(order(over), NOW) as { ok: true; code: string }).code)!.id;
const count = (table: string) => (getDb().prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;

test("clearing removes every order, its items and its receipt", () => {
  place();
  place({ lines: [{ variantId: ids.v500, qty: 1 }] });
  expect(clearAllOrders()).toMatchObject({ orders: 2 });
  expect(listOrders()).toEqual([]);
  expect([count("orders"), count("order_items"), count("payment_proofs")]).toEqual([0, 0, 0]);
});

test("stock from orders that were not cancelled goes back; cancelled ones were already restocked", () => {
  place({ lines: [{ variantId: ids.v250, qty: 2 }] }); // 5 -> 3
  const cancelled = place({ lines: [{ variantId: ids.v250, qty: 1 }] }); // 3 -> 2
  changeStatus(cancelled, "cancelled"); // back to 3
  const delivered = place({ lines: [{ variantId: ids.v500, qty: 1 }] }); // 1 -> 0
  for (const s of ["confirmed", "shipped", "delivered"] as const) changeStatus(delivered, s);
  expect([stock(ids.v250), stock(ids.v500)]).toEqual([3, 0]);

  expect(clearAllOrders()).toEqual({ orders: 3, unitsRestocked: 3, backup: null });
  expect([stock(ids.v250), stock(ids.v500)]).toEqual([5, 1]);
});

test("an item whose option was deleted since is skipped, not an error", () => {
  place({ lines: [{ variantId: ids.v500, qty: 1 }] });
  updateProduct(ids.productId, { ...product, variants: getProductById(ids.productId)!.variants.filter((v) => v.id === ids.v250) });
  expect(clearAllOrders()).toMatchObject({ orders: 1, unitsRestocked: 0 });
});

test("order codes start again from 0001 after clearing", () => {
  place();
  place();
  clearAllOrders();
  expect((placeOrder(order(), NOW) as { ok: true; code: string }).code).toBe("JC-2610-0001");
});

test("clearing an empty history is fine", () => {
  expect(clearAllOrders()).toMatchObject({ orders: 0, unitsRestocked: 0 });
});

test("on a real database file, a full copy with the orders is saved before clearing", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const { closeDb } = await import("@/lib/db");
  const { DatabaseSync } = await import("node:sqlite");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jc-clear-"));
  try {
    process.env.DB_PATH = path.join(dir, "store.db");
    closeDb();
    const { createProduct } = await import("@/lib/products");
    const id = (createProduct(product) as { ok: true; id: number }).id;
    const v = getProductById(id)!.variants[0].id;
    placeOrder(order({ lines: [{ variantId: v, qty: 1 }] }), NOW);
    const { backup } = clearAllOrders();
    expect(backup).toMatch(/store\.before-clearing-orders-.*\.db$/);
    closeDb();
    const copy = new DatabaseSync(backup!);
    expect((copy.prepare("SELECT COUNT(*) AS c FROM orders").get() as { c: number }).c).toBe(1);
    copy.close();
  } finally {
    closeDb();
    process.env.DB_PATH = ":memory:";
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
