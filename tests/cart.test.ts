import { expect, test } from "vitest";
import { addLine, countOf, parseCart, reconcile, setQty, subtotalOf, type CartLine } from "@/lib/cart";

const line = (over: Partial<CartLine> = {}): CartLine => ({
  variantId: 1, qty: 1, productName: "Benguet Arabica", variantName: "250g", slug: "benguet-arabica",
  price: 48000, image: null, stock: 5, ...over,
});
const info = (over = {}) => ({
  variantId: 1, productName: "Benguet Arabica", variantName: "250g", slug: "benguet-arabica",
  price: 48000, stock: 5, image: null, ...over,
});

test.each([null, "", "not json", "{}", "42", '[{"variantId":"x"}]', '[{"variantId":1,"qty":0}]', "[null]"])(
  "parseCart(%j) is an empty cart",
  (raw) => expect(parseCart(raw)).toEqual([]),
);

test("parseCart keeps good lines and drops bad ones", () => {
  expect(parseCart(JSON.stringify([line(), { variantId: 2 }]))).toEqual([line()]);
});

test("addLine merges by variant and clamps to stock", () => {
  expect(addLine([line({ qty: 4 })], line({ qty: 3 }))[0].qty).toBe(5);
  expect(addLine([], line({ variantId: 2 }))).toHaveLength(1);
});

test("setQty clamps and removes at zero", () => {
  expect(setQty([line()], 1, 99)[0].qty).toBe(5);
  expect(setQty([line()], 1, 0)).toEqual([]);
});

test("reconcile removes dead lines, lowers qty and refreshes price", () => {
  const cart = [line({ qty: 4 }), line({ variantId: 2, variantName: "500g" }), line({ variantId: 3, variantName: "1kg" })];
  const r = reconcile(cart, [info({ stock: 2, price: 50000 }), info({ variantId: 3, variantName: "1kg", stock: 0 })]);
  expect(r.cart).toEqual([line({ qty: 2, stock: 2, price: 50000 })]);
  expect(r.removed).toEqual(["Benguet Arabica — 500g", "Benguet Arabica — 1kg"]);
  expect(r.reduced).toEqual(["Benguet Arabica — 250g"]);
});

test("subtotal and count", () => {
  const cart = [line({ qty: 2 }), line({ variantId: 2, price: 10000 })];
  expect([subtotalOf(cart), countOf(cart)]).toEqual([106000, 3]);
});
