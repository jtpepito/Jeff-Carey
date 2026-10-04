import { beforeEach, expect, test } from "vitest";
import {
  changeStatus, dashboardStats, getOrder, getOrderByCode, listOrders, placeOrder, setAdminNotes, type OrderInput,
} from "@/lib/orders";
import { getProductById, removeProduct, updateProduct } from "@/lib/products";
import { ids, NOW, order, product, setupShop, stock } from "./order-fixtures";

beforeEach(setupShop);

const idOf = (code: string) => getOrderByCode(code)!.id;
const place = (over: Partial<OrderInput> = {}, now = NOW) =>
  idOf((placeOrder(order(over), now) as { ok: true; code: string }).code);

test("walks new -> confirmed -> shipped -> delivered", () => {
  const id = place();
  for (const s of ["confirmed", "shipped", "delivered"] as const) expect(changeStatus(id, s)).toEqual({ ok: true });
  expect(getOrder(id)!.status).toBe("delivered");
});

test.each([["new", "shipped"], ["new", "delivered"], ["confirmed", "new"]] as const)("rejects %s -> %s", (from, to) => {
  const id = place();
  if (from === "confirmed") changeStatus(id, "confirmed");
  expect(changeStatus(id, to).ok).toBe(false);
  expect(getOrder(id)!.status).toBe(from);
});

test("cancel restocks, exactly once, and is final", () => {
  const id = place({ lines: [{ variantId: ids.v250, qty: 2 }] });
  expect(stock(ids.v250)).toBe(3);
  expect(changeStatus(id, "cancelled")).toEqual({ ok: true });
  expect(stock(ids.v250)).toBe(5);
  expect(changeStatus(id, "cancelled").ok).toBe(false);
  expect(changeStatus(id, "confirmed").ok).toBe(false);
  expect(stock(ids.v250)).toBe(5);
});

test("delivered orders cannot be cancelled", () => {
  const id = place();
  for (const s of ["confirmed", "shipped", "delivered"] as const) changeStatus(id, s);
  expect(changeStatus(id, "cancelled").ok).toBe(false);
  expect(stock(ids.v250)).toBe(4);
});

test("cancel survives a variant that was removed after the order", () => {
  const id = place({ lines: [{ variantId: ids.v500, qty: 1 }] });
  const keep = getProductById(ids.productId)!.variants.filter((v) => v.id === ids.v250);
  updateProduct(ids.productId, { ...product, variants: keep });
  expect(changeStatus(id, "cancelled")).toEqual({ ok: true });
});

test("unknown order id", () => {
  expect(changeStatus(424242, "confirmed").ok).toBe(false);
  expect(getOrder(424242)).toBeNull();
  expect(getOrderByCode("JC-0000-0000")).toBeNull();
});

test("getOrder returns contact, payment and item snapshots", () => {
  const id = place({ paymentMethod: "gcash", gcashRef: "777", notes: "Leave at the gate", lines: [{ variantId: ids.v250, qty: 2 }] });
  expect(getOrder(id)).toMatchObject({
    code: "JC-2610-0001", customerName: "Ana Reyes", mobile: "09171234567", province: "Cebu",
    city: "Cebu City", address: "12 Mabini St", notes: "Leave at the gate", adminNotes: "",
    paymentMethod: "gcash", gcashRef: "777", subtotal: 100000, shippingFee: 16000, total: 116000,
    status: "new", createdAt: NOW.toISOString(),
    items: [{ productId: ids.productId, variantId: ids.v250, name: "Benguet Arabica — 250g", price: 50000, qty: 2 }],
  });
});

test("a product with order history is deactivated, not deleted", () => {
  const id = place();
  expect(removeProduct(ids.productId)).toBe("deactivated");
  expect(getProductById(ids.productId)!.active).toBe(false);
  expect(getOrder(id)!.items[0].name).toBe("Benguet Arabica — 250g");
});

test("dashboard: Manila-day orders, revenue without cancelled, pending count", () => {
  place({}, new Date("2026-10-03T15:00:00Z")); // Oct 3, 23:00 Manila -> yesterday
  place({ lines: [{ variantId: ids.v250, qty: 1 }] }, NOW); // today, 66000
  const cancelled = place({ lines: [{ variantId: ids.v250, qty: 1 }] }, NOW);
  changeStatus(cancelled, "cancelled");
  const d = dashboardStats(NOW);
  expect(d.todayOrders).toHaveLength(2);
  expect(d.todayRevenue).toBe(66000);
  expect(d.pendingCount).toBe(2);
});

test("listOrders filters by status, newest first; admin notes save", () => {
  const a = place({}, new Date("2026-10-01T03:00:00Z"));
  const b = place({}, NOW);
  changeStatus(a, "confirmed");
  expect(listOrders().map((o) => o.id)).toEqual([b, a]);
  expect(listOrders({ status: "confirmed" }).map((o) => o.id)).toEqual([a]);
  setAdminNotes(a, "Called customer");
  expect(getOrder(a)!.adminNotes).toBe("Called customer");
});

test("saving a product does not undo stock sold while the form was open", () => {
  const form = getProductById(ids.productId)!.variants.map((v) => ({ ...v, stockWas: v.stock })); // loaded at 5 and 1
  place({ lines: [{ variantId: ids.v250, qty: 3 }] }); // 250g is now 2
  updateProduct(ids.productId, { ...product, name: "Benguet Arabica (typo fixed)", variants: form });
  expect(stock(ids.v250)).toBe(2);
  // A deliberate change is applied as a difference: 5 -> 8 means +3.
  updateProduct(ids.productId, { ...product, variants: form.map((v) => (v.id === ids.v250 ? { ...v, stock: 8 } : v)) });
  expect(stock(ids.v250)).toBe(5);
  // Lowering by more than is left stops at zero.
  updateProduct(ids.productId, { ...product, variants: form.map((v) => (v.id === ids.v250 ? { ...v, stock: 0, stockWas: 50 } : v)) });
  expect(stock(ids.v250)).toBe(0);
});
