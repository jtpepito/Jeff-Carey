import { beforeEach, expect, test } from "vitest";
import { getDb } from "@/lib/db";
import { placeOrder, type OrderInput } from "@/lib/orders";
import { getProductById, updateProduct } from "@/lib/products";
import { ids, NOW, order, orderCount, product, setupShop, stock } from "./order-fixtures";

beforeEach(setupShop);

test("places an order: totals, status, code, stock decrement, snapshots", () => {
  const r = placeOrder(order({ lines: [{ variantId: ids.v250, qty: 2 }] }), NOW);
  expect(r).toEqual({ ok: true, code: "BL-2610-0001" });
  const o = getDb().prepare("SELECT * FROM orders").get() as Record<string, unknown>;
  expect(o).toMatchObject({ subtotal: 100000, shipping_fee: 8000, total: 108000, status: "new", gcash_ref: null, created_at: NOW.toISOString() });
  expect(stock(ids.v250)).toBe(3);
  expect(getDb().prepare("SELECT name_snapshot, price_snapshot, qty FROM order_items").all())
    .toEqual([{ name_snapshot: "Benguet Arabica — 250g", price_snapshot: 50000, qty: 2 }]);
});

test("free shipping at exactly ₱1,500, charged just below", () => {
  placeOrder(order({ lines: [{ variantId: ids.v250, qty: 3 }] }), NOW); // 150000
  placeOrder(order({ lines: [{ variantId: ids.v250, qty: 2 }] }), NOW); // 100000
  const fees = getDb().prepare("SELECT shipping_fee FROM orders ORDER BY id").all().map((r) => r.shipping_fee);
  expect(fees).toEqual([0, 8000]);
});

test("shipping fee follows the region group of the province", () => {
  placeOrder(order({ province: "Cebu", city: "Cebu City" }), NOW);
  expect((getDb().prepare("SELECT shipping_fee f FROM orders").get() as { f: number }).f).toBe(16000);
});

test("insufficient stock rejects the whole order and changes nothing", () => {
  const r = placeOrder(order({ lines: [{ variantId: ids.v250, qty: 1 }, { variantId: ids.v500, qty: 2 }] }), NOW);
  expect(r).toMatchObject({ ok: false, field: "lines" });
  expect((r as { error: string }).error).toContain("Benguet Arabica — 500g");
  expect([stock(ids.v250), stock(ids.v500), orderCount()]).toEqual([5, 1, 0]);
});

test("the last unit can only be bought once", () => {
  expect(placeOrder(order({ lines: [{ variantId: ids.v500, qty: 1 }] }), NOW).ok).toBe(true);
  expect(placeOrder(order({ lines: [{ variantId: ids.v500, qty: 1 }] }), NOW).ok).toBe(false);
  expect(stock(ids.v500)).toBe(0);
});

test("duplicate lines for one variant are merged before the stock check", () => {
  const r = placeOrder(order({ lines: [{ variantId: ids.v250, qty: 3 }, { variantId: ids.v250, qty: 3 }] }), NOW);
  expect(r.ok).toBe(false);
  expect(stock(ids.v250)).toBe(5);
});

test.each([0, -1, 1.5, 1000, Number.NaN])("qty %s is rejected", (qty) => {
  expect(placeOrder(order({ lines: [{ variantId: ids.v250, qty }] }), NOW)).toMatchObject({ ok: false, field: "lines" });
  expect(stock(ids.v250)).toBe(5);
});

test("empty cart, unknown variant and inactive product are rejected", () => {
  expect(placeOrder(order({ lines: [] }), NOW)).toMatchObject({ ok: false, field: "lines" });
  expect(placeOrder(order({ lines: [{ variantId: 99999, qty: 1 }] }), NOW)).toMatchObject({ ok: false, field: "lines" });
  updateProduct(ids.productId, { ...product, active: false, variants: getProductById(ids.productId)!.variants });
  expect(placeOrder(order(), NOW)).toMatchObject({ ok: false, field: "lines" });
});

test.each([
  [{ customerName: "  " }, "customerName"], [{ mobile: "9171234567" }, "mobile"], [{ mobile: "0917123456a" }, "mobile"],
  [{ province: "Atlantis" }, "province"], [{ city: "Cebu City" }, "city"], [{ address: "" }, "address"],
  [{ paymentMethod: "card" as never }, "paymentMethod"],
])("contact validation %j -> %s", (over, field) => {
  expect(placeOrder(order(over as Partial<OrderInput>), NOW)).toMatchObject({ ok: false, field });
  expect(orderCount()).toBe(0);
});

test("GCash requires a reference and stores it trimmed; COD stores null", () => {
  expect(placeOrder(order({ paymentMethod: "gcash" }), NOW)).toMatchObject({ ok: false, field: "gcashRef" });
  expect(placeOrder(order({ paymentMethod: "gcash", gcashRef: "   " }), NOW)).toMatchObject({ ok: false, field: "gcashRef" });
  placeOrder(order({ paymentMethod: "gcash", gcashRef: " 1234567890123 " }), NOW);
  placeOrder(order({ paymentMethod: "cod", gcashRef: "ignored" }), NOW);
  expect(getDb().prepare("SELECT gcash_ref FROM orders ORDER BY id").all().map((r) => r.gcash_ref)).toEqual(["1234567890123", null]);
});

test("price comes from the database at purchase time and later edits do not rewrite the order", () => {
  placeOrder(order(), NOW);
  updateProduct(ids.productId, { ...product, name: "Renamed", price: 99900, variants: getProductById(ids.productId)!.variants });
  expect(getDb().prepare("SELECT name_snapshot, price_snapshot FROM order_items").get())
    .toEqual({ name_snapshot: "Benguet Arabica — 250g", price_snapshot: 50000 });
});

test("mobile with spaces or dashes is normalised", () => {
  placeOrder(order({ mobile: "0917 123-4567" }), NOW);
  expect((getDb().prepare("SELECT mobile m FROM orders").get() as { m: string }).m).toBe("09171234567");
});

test("retrying with the same request id returns the first order instead of making a second", () => {
  const input = order({ requestId: "req-abc-123", lines: [{ variantId: ids.v250, qty: 2 }] });
  const first = placeOrder(input, NOW);
  const again = placeOrder(input, NOW);
  expect(first).toEqual({ ok: true, code: "BL-2610-0001" });
  expect(again).toEqual(first);
  expect([orderCount(), stock(ids.v250)]).toEqual([1, 3]);
  expect(placeOrder(order({ requestId: "req-other" }), NOW)).toEqual({ ok: true, code: "BL-2610-0002" });
});
