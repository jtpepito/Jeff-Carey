import { beforeEach, expect, test } from "vitest";
import { getDb } from "@/lib/db";
import { listOrders } from "@/lib/orders";
import { listCategories, listProducts } from "@/lib/products";
import { seed } from "@/lib/seed-data";
import { freshDb } from "./helpers";

beforeEach(freshDb);

test("seed creates 12 products in 3 categories and 15 mixed-status orders", () => {
  seed(new Date("2026-10-04T03:00:00Z"));
  expect(listProducts()).toHaveLength(12);
  expect(listCategories().sort()).toEqual(["Coffee", "Pantry", "Tablea & Cacao"]);
  expect(listProducts().filter((p) => p.featured)).toHaveLength(4);
  const orders = listOrders();
  expect(orders).toHaveLength(15);
  expect(new Set(orders.map((o) => o.status)).size).toBe(5);
  for (const o of orders) expect(o.total).toBe(o.subtotal + o.shippingFee);
  const gcash = orders.filter((o) => o.paymentMethod === "gcash");
  expect(gcash).toHaveLength(6);
  expect(gcash.every((o) => o.gcashRef)).toBe(true);
  expect((getDb().prepare("SELECT MIN(stock) m FROM variants").get() as { m: number }).m).toBe(0);
});

test("seeding twice gives the same counts", () => {
  seed();
  seed();
  expect(listProducts()).toHaveLength(12);
  expect(listOrders()).toHaveLength(15);
});
