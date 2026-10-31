import { beforeEach, expect, test } from "vitest";
import { getDb } from "@/lib/db";
import { getOrderByCode, MAX_OPEN_ORDERS_PER_CUSTOMER, placeOrder, type OrderInput } from "@/lib/orders";
import { getProductById, updateProduct } from "@/lib/products";
import { ids, NOW, order, orderCount, product, RECEIPT_PNG, receipt, setupShop, stock } from "./order-fixtures";
import { getPaymentProof } from "@/lib/orders";

beforeEach(setupShop);

test("places an order: totals, status, code, stock decrement, snapshots", () => {
  const r = placeOrder(order({ lines: [{ variantId: ids.v250, qty: 2 }] }), NOW);
  expect(r).toMatchObject({ ok: true, code: "JC-2610-0001" });
  const o = getDb().prepare("SELECT * FROM orders").get() as Record<string, unknown>;
  expect(o).toMatchObject({ subtotal: 100000, shipping_fee: 16000, total: 116000, status: "new", gcash_ref: null, created_at: NOW.toISOString() });
  expect(stock(ids.v250)).toBe(3);
  expect(getDb().prepare("SELECT name_snapshot, price_snapshot, qty FROM order_items").all())
    .toEqual([{ name_snapshot: "Benguet Arabica — 250g", price_snapshot: 50000, qty: 2 }]);
});

test("free shipping at exactly ₱1,500, charged just below", () => {
  placeOrder(order({ lines: [{ variantId: ids.v250, qty: 3 }] }), NOW); // 150000
  placeOrder(order({ lines: [{ variantId: ids.v250, qty: 2 }] }), NOW); // 100000
  const fees = getDb().prepare("SELECT shipping_fee FROM orders ORDER BY id").all().map((r) => r.shipping_fee);
  expect(fees).toEqual([0, 16000]);
});

test("an address outside the delivery area is refused and nothing changes", () => {
  const r = placeOrder(order({ province: "Metro Manila", city: "Quezon City" }), NOW);
  expect(r).toEqual({ ok: false, field: "province", error: "Sorry, we only deliver within Cebu." });
  expect([orderCount(), stock(ids.v250)]).toEqual([0, 5]);
});

test("any city or municipality in Cebu is accepted", () => {
  expect(placeOrder(order({ city: "Oslob" }), NOW).ok).toBe(true);
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
  [{ province: "Atlantis" }, "province"], [{ city: "Quezon City" }, "city"], [{ address: "" }, "address"],
  [{ paymentMethod: "card" as never }, "paymentMethod"],
])("contact validation %j -> %s", (over, field) => {
  expect(placeOrder(order(over as Partial<OrderInput>), NOW)).toMatchObject({ ok: false, field });
  expect(orderCount()).toBe(0);
});

test("bank transfer and GCash both need a receipt; the reference number is optional and kept trimmed", () => {
  expect(placeOrder(order({ paymentMethod: "bank", proof: undefined }), NOW)).toMatchObject({ ok: false, field: "proof" });
  expect(placeOrder(order({ paymentMethod: "gcash", proof: undefined }), NOW)).toMatchObject({ ok: false, field: "proof" });
  expect(placeOrder(order({ proof: { name: "empty.png", data: new Uint8Array() } }), NOW)).toMatchObject({ ok: false, field: "proof" });
  expect(orderCount()).toBe(0);
  placeOrder(order({ paymentMethod: "gcash", gcashRef: " 1234567890123 " }), NOW);
  placeOrder(order({ paymentMethod: "bank" }), NOW);
  expect(getDb().prepare("SELECT payment_method, gcash_ref FROM orders ORDER BY id").all()).toEqual([
    { payment_method: "gcash", gcash_ref: "1234567890123" },
    { payment_method: "bank", gcash_ref: null },
  ]);
});

test("cash is no longer accepted for new orders", () => {
  expect(placeOrder(order({ paymentMethod: "cod" as never }), NOW)).toMatchObject({ ok: false, field: "paymentMethod" });
  expect(orderCount()).toBe(0);
});

test("a receipt must really be a photo or a PDF, and no larger than 5 MB", () => {
  const html = Uint8Array.from(Buffer.from("<html><script>alert(1)</script></html>"));
  expect(placeOrder(order({ proof: { name: "receipt.png", data: html } }), NOW)).toMatchObject({ ok: false, field: "proof" });
  const huge = new Uint8Array(5 * 1024 * 1024 + 1);
  huge.set(RECEIPT_PNG);
  expect(placeOrder(order({ proof: { name: "huge.png", data: huge } }), NOW)).toMatchObject({ ok: false, field: "proof" });
  expect(orderCount()).toBe(0);
  expect(stock(ids.v250)).toBe(5);
});

test("the receipt is stored with the order, typed by its contents", () => {
  const r = placeOrder(order({ proof: { name: "  my receipt.png ", data: RECEIPT_PNG } }), NOW) as { ok: true; code: string };
  const id = (getDb().prepare("SELECT id FROM orders WHERE code = ?").get(r.code) as { id: number }).id;
  const proof = getPaymentProof(id)!;
  expect(proof).toMatchObject({ fileName: "my receipt.png", mime: "image/png", size: RECEIPT_PNG.length });
  expect(Array.from(proof.data)).toEqual(Array.from(RECEIPT_PNG));
  expect(getPaymentProof(999999)).toBeNull();
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
  expect(first).toMatchObject({ ok: true, code: "JC-2610-0001" });
  expect(again).toEqual(first);
  expect([orderCount(), stock(ids.v250)]).toEqual([1, 3]);
  expect(placeOrder(order({ requestId: "req-other" }), NOW)).toMatchObject({ ok: true, code: "JC-2610-0002" });
});

test("pickup needs no address and never charges a delivery fee", () => {
  const r = placeOrder(order({ fulfilment: "pickup", province: "", city: "", address: "" }), NOW);
  expect(r).toMatchObject({ ok: true, code: "JC-2610-0001" });
  expect(getDb().prepare("SELECT fulfilment, shipping_fee, subtotal, total, province, city, address FROM orders").get())
    .toEqual({ fulfilment: "pickup", shipping_fee: 0, subtotal: 50000, total: 50000, province: "", city: "", address: "" });
  expect(stock(ids.v250)).toBe(4);
});

test("pickup does not store an address even if one is sent", () => {
  placeOrder(order({ fulfilment: "pickup" }), NOW);
  expect(getDb().prepare("SELECT province, city, address FROM orders").get()).toEqual({ province: "", city: "", address: "" });
});

test("delivery is the default and still needs an address", () => {
  expect(placeOrder(order({ address: "" }), NOW)).toMatchObject({ ok: false, field: "address" });
  expect(placeOrder(order({ fulfilment: "delivery", city: "" }), NOW)).toMatchObject({ ok: false, field: "city" });
  placeOrder(order(), NOW);
  expect((getDb().prepare("SELECT fulfilment f FROM orders").get() as { f: string }).f).toBe("delivery");
});

test("an unknown fulfilment value is rejected", () => {
  expect(placeOrder(order({ fulfilment: "drone" as never }), NOW)).toMatchObject({ ok: false, field: "fulfilment" });
  expect(orderCount()).toBe(0);
});

test("pickup still needs a name, a mobile number and a receipt", () => {
  expect(placeOrder(order({ fulfilment: "pickup", customerName: "" }), NOW)).toMatchObject({ ok: false, field: "customerName" });
  expect(placeOrder(order({ fulfilment: "pickup", mobile: "123" }), NOW)).toMatchObject({ ok: false, field: "mobile" });
  expect(placeOrder(order({ fulfilment: "pickup", paymentMethod: "gcash", proof: undefined }), NOW)).toMatchObject({ ok: false, field: "proof" });
  expect(placeOrder(order({ fulfilment: "pickup", proof: receipt() }), NOW)).toMatchObject({ ok: true });
});

test("an option with its own price is charged at that price", () => {
  updateProduct(ids.productId, { ...product, variants: [{ id: ids.v250, name: "250g", stock: 5, sku: "", price: 12345 }, { id: ids.v500, name: "500g", stock: 1, sku: "" }] });
  placeOrder(order({ lines: [{ variantId: ids.v250, qty: 2 }, { variantId: ids.v500, qty: 1 }] }), NOW);
  expect(getDb().prepare("SELECT price_snapshot, qty FROM order_items ORDER BY id").all()).toEqual([{ price_snapshot: 12345, qty: 2 }, { price_snapshot: 50000, qty: 1 }]);
  expect((getDb().prepare("SELECT subtotal s FROM orders").get() as { s: number }).s).toBe(12345 * 2 + 50000);
});

test("a preferred date is required and must be at least 2 days out and within 60 days", () => {
  // NOW is 2026-10-04 11:00 Manila, so the earliest allowed date is 2026-10-06.
  expect(placeOrder(order({ preferredDate: "" }), NOW)).toMatchObject({ ok: false, field: "preferredDate" });
  expect(placeOrder(order({ preferredDate: "2026-10-05" }), NOW)).toMatchObject({ ok: false, field: "preferredDate" });
  expect(placeOrder(order({ preferredDate: "2026-12-10" }), NOW)).toMatchObject({ ok: false, field: "preferredDate" });
  expect(placeOrder(order({ preferredDate: "next tuesday" }), NOW)).toMatchObject({ ok: false, field: "preferredDate" });
  expect(orderCount()).toBe(0);
  expect(placeOrder(order({ preferredDate: "2026-10-06" }), NOW)).toMatchObject({ ok: true, code: "JC-2610-0001" });
  expect((getDb().prepare("SELECT preferred_date d FROM orders").get() as { d: string }).d).toBe("2026-10-06");
});

test("pickup orders carry a preferred date too", () => {
  expect(placeOrder(order({ fulfilment: "pickup", preferredDate: "2026-10-08" }), NOW)).toMatchObject({ ok: true });
  expect(placeOrder(order({ fulfilment: "pickup", preferredDate: "" }), NOW)).toMatchObject({ ok: false, field: "preferredDate" });
});

test("when the shop is pickup-only, delivery orders are refused and pickup is the default", () => {
  process.env.ALLOW_DELIVERY = "";
  try {
    expect(placeOrder(order({ fulfilment: "delivery" }), NOW)).toMatchObject({ ok: false, field: "fulfilment" });
    expect(orderCount()).toBe(0);
    expect(placeOrder(order({ fulfilment: undefined, province: "", city: "", address: "" }), NOW)).toMatchObject({ ok: true });
    expect((getDb().prepare("SELECT fulfilment f FROM orders").get() as { f: string }).f).toBe("pickup");
  } finally {
    process.env.ALLOW_DELIVERY = "1";
  }
});

test("an email address is required and kept trimmed", () => {
  expect(placeOrder(order({ email: "" }), NOW)).toMatchObject({ ok: false, field: "email" });
  expect(placeOrder(order({ email: "ana@" }), NOW)).toMatchObject({ ok: false, field: "email" });
  expect(placeOrder(order({ email: "ana reyes@example.com" }), NOW)).toMatchObject({ ok: false, field: "email" });
  expect(placeOrder(order({ email: "a".repeat(250) + "@x.co" }), NOW)).toMatchObject({ ok: false, field: "email" });
  expect(orderCount()).toBe(0);
  placeOrder(order({ email: "  Ana.Reyes@Example.com " }), NOW);
  expect((getDb().prepare("SELECT email FROM orders").get() as { email: string }).email).toBe("Ana.Reyes@Example.com");
});

test("an email that smuggles a second address or mailto tricks is refused", () => {
  for (const email of ["me@x.com,other@y.com", "me@x.com;other@y.com", "Me <me@x.com>", "me?cc=o@y.com@x.com", "me@x", "me@x.com\nbcc: o@y.com"]) {
    const r = placeOrder(order({ email }), NOW);
    expect(r, email).toMatchObject({ ok: false, field: "email" });
  }
  for (const email of ["ana.reyes+shop@gmail.com", "a_b-c@sub.example.co.uk"]) expect(placeOrder(order({ email }), NOW).ok, email).toBe(true);
});

test("a customer can have only a few orders waiting for confirmation at a time", () => {
  const ok = () => placeOrder(order({ lines: [{ variantId: ids.v250, qty: 1 }] }), NOW);
  for (let i = 0; i < MAX_OPEN_ORDERS_PER_CUSTOMER; i++) expect(ok().ok).toBe(true);
  const r = ok();
  expect(r).toMatchObject({ ok: false, field: "mobile" });
  expect((r as { error: string }).error).toContain(`${MAX_OPEN_ORDERS_PER_CUSTOMER} orders`);
  // The same mobile with a different email is still the same customer; so is the same email with another mobile.
  expect(placeOrder(order({ email: "other@example.com", lines: [{ variantId: ids.v250, qty: 1 }] }), NOW).ok).toBe(false);
  expect(placeOrder(order({ mobile: "09998887777", lines: [{ variantId: ids.v250, qty: 1 }] }), NOW).ok).toBe(false);
  // Someone else can still order, and once an order is confirmed it no longer counts.
  expect(placeOrder(order({ mobile: "09998887777", email: "other@example.com", lines: [{ variantId: ids.v250, qty: 1 }] }), NOW).ok).toBe(true);
  getDb().prepare("UPDATE orders SET status = 'confirmed' WHERE id = 1").run();
  expect(ok().ok).toBe(true);
});

test("every order gets a secret view token, and a retried request returns the same one", () => {
  const first = placeOrder(order({ requestId: "req-1" }), NOW);
  expect(first).toMatchObject({ ok: true, token: expect.stringMatching(/^[A-Za-z0-9_-]{12}$/) });
  const again = placeOrder(order({ requestId: "req-1" }), NOW);
  expect(again).toEqual(first);
  const second = placeOrder(order({ requestId: "req-2", mobile: "09998887777", email: "b@example.com" }), NOW);
  expect((second as { token: string }).token).not.toBe((first as { token: string }).token);
  expect(getOrderByCode("JC-2610-0001")?.viewToken).toBe((first as { token: string }).token);
});
