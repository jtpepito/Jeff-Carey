import { beforeEach, expect, test } from "vitest";
import {
  applySuggestedPrice, deleteComponent, deleteIngredient, getRecipe, listComponents, listIngredients, productCosts,
  saveComponent, saveIngredient, saveRecipe,
} from "@/lib/recipes";
import { getProductById, removeProduct } from "@/lib/products";
import { updateSettings } from "@/lib/settings";
import { ids, product, setupShop } from "./order-fixtures";

beforeEach(() => {
  setupShop();
  updateSettings({ labourRate: 8000, targetMarkup: 5 });
});

const idOf = (r: { ok: true; id: number } | { ok: false }) => (r as { id: number }).id;
const flour = () => idOf(saveIngredient(null, { name: "Bread flour", unit: "g", packQty: 1000, packCost: 4800 }));
const eggs = () => idOf(saveIngredient(null, { name: "Eggs", unit: "pc", packQty: 1, packCost: 900 }));
const sugar = () => idOf(saveIngredient(null, { name: "Sugar", unit: "g", packQty: 1000, packCost: 8000 }));
const base = (items: { ingredientId?: number; componentId?: number; qty: number }[], over = {}) => ({
  yield: 1, labourMinutes: 0, packagingCost: 0, notes: "", items, variants: [], ...over,
});

test("ingredients are created, listed alphabetically and edited in place", () => {
  const e = eggs();
  const f = flour();
  expect(listIngredients().map((i) => i.name)).toEqual(["Bread flour", "Eggs"]);
  expect(saveIngredient(f, { name: "Bread flour", unit: "g", packQty: 25000, packCost: 110000 }).ok).toBe(true);
  expect(listIngredients()[0]).toMatchObject({ id: f, packQty: 25000, packCost: 110000 });
  expect(e).toBeGreaterThan(0);
});

test.each([
  [{ name: " ", unit: "g", packQty: 1, packCost: 1 }, "name"],
  [{ name: "Salt", unit: "", packQty: 1, packCost: 1 }, "unit"],
  [{ name: "Salt", unit: "g", packQty: 0, packCost: 1 }, "packQty"],
  [{ name: "Salt", unit: "g", packQty: 1, packCost: -1 }, "packCost"],
  [{ name: "Salt", unit: "g", packQty: 1, packCost: 1.5 }, "packCost"],
])("rejects %j on %s", (input, field) => {
  expect(saveIngredient(null, input)).toMatchObject({ ok: false, field });
});

test("a component is a sub-recipe with a cost per unit of what it yields", () => {
  const f = flour();
  const e = eggs();
  // 1,000 g flour (₱48) + 2 eggs (₱18) makes 1,200 g of dough: ₱66 / 1,200 g = 5.5 centavos per g
  const r = saveComponent(null, { name: "Sweet dough", yieldQty: 1200, yieldUnit: "g", notes: "", items: [{ ingredientId: f, qty: 1000 }, { ingredientId: e, qty: 2 }] });
  expect(r.ok).toBe(true);
  const [dough] = listComponents();
  expect(dough).toMatchObject({ name: "Sweet dough", yieldQty: 1200, yieldUnit: "g", batchCost: 6600 });
  expect(dough.unitCost).toBeCloseTo(5.5, 5);
  expect(dough.items.map((i) => [i.name, i.qty, i.lineCost])).toEqual([["Bread flour", 1000, 4800], ["Eggs", 2, 1800]]);
});

test.each([
  [{ name: "" }, "name"], [{ yieldQty: 0 }, "yieldQty"], [{ yieldUnit: " " }, "yieldUnit"],
  [{ items: [{ ingredientId: 9999, qty: 1 }] }, "items"], [{ items: [{ ingredientId: 0, qty: 0 }] }, "items"],
])("component validation %j -> %s", (over, field) => {
  const f = flour();
  const input = { name: "Dough", yieldQty: 100, yieldUnit: "g", notes: "", items: [{ ingredientId: f, qty: 1 }], ...over };
  if ((over as { items?: { ingredientId: number; qty: number }[] }).items?.[0]?.ingredientId === 0) input.items = [{ ingredientId: f, qty: 0 }];
  expect(saveComponent(null, input)).toMatchObject({ ok: false, field });
});

test("a recipe can use ingredients and components, per batch, with a cost per unit sold", () => {
  const f = flour();
  const e = eggs();
  const dough = idOf(saveComponent(null, { name: "Sweet dough", yieldQty: 1200, yieldUnit: "g", notes: "", items: [{ ingredientId: f, qty: 1000 }, { ingredientId: e, qty: 2 }] }));
  // Batch of 12 pieces: 600 g dough (₱33) + 1 egg (₱9) = ₱42; labour 30 min at ₱80/h = ₱40; ₱82 / 12 = ₱6.83 a piece.
  expect(saveRecipe(ids.productId, base([{ componentId: dough, qty: 600 }, { ingredientId: e, qty: 1 }], { yield: 12, labourMinutes: 30, packagingCost: 1500 }))).toEqual({ ok: true });
  const r = getRecipe(ids.productId)!;
  expect(r.items.map((i) => [i.name, i.unit, i.qty, i.lineCost])).toEqual([["Sweet dough", "g", 600, 3300], ["Eggs", "pc", 1, 900]]);
  expect(r.cost).toMatchObject({ ingredientsCost: 4200, labourCost: 4000, batchCost: 8200 });
  expect(r.cost.perPiece).toBeCloseTo(8200 / 12, 3);
  // Every product option is listed; with nothing set, each sells 1 piece with the default packaging.
  expect(r.variants.map((v) => [v.variantId, v.pieces, v.packagingCost, v.cost.unitCost])).toEqual([
    [ids.v250, 1, 1500, Math.round(8200 / 12) + 1500],
    [ids.v500, 1, 1500, Math.round(8200 / 12) + 1500],
  ]);
});

test("each option can sell several pieces, override packaging and add its own batch lines", () => {
  const f = flour();
  const s = sugar();
  saveRecipe(ids.productId, base([{ ingredientId: f, qty: 1000 }], {
    yield: 10, packagingCost: 1000,
    variants: [
      { variantId: ids.v250, pieces: 4, packagingCost: 4000, items: [] },
      // Box of 9 with a choco topping: 500 g sugar (₱40) more per batch -> ₱88 / 10 = ₱8.80 a piece
      { variantId: ids.v500, pieces: 9, packagingCost: null, items: [{ ingredientId: s, qty: 500 }] },
    ],
  }));
  const r = getRecipe(ids.productId)!;
  const box4 = r.variants.find((v) => v.variantId === ids.v250)!;
  const box9 = r.variants.find((v) => v.variantId === ids.v500)!;
  expect(box4).toMatchObject({ pieces: 4, packagingCost: 4000 });
  expect(box4.cost.unitCost).toBe(Math.round(480 * 4) + 4000);
  expect(box9).toMatchObject({ pieces: 9, packagingCost: 1000 });
  expect(box9.items.map((i) => [i.name, i.qty, i.lineCost])).toEqual([["Sugar", 500, 4000]]);
  expect(box9.cost.unitCost).toBe(Math.round(880 * 9) + 1000);
});

test("suggested price is cost before packaging times the target markup, plus packaging", () => {
  const f = flour();
  saveRecipe(ids.productId, base([{ ingredientId: f, qty: 1000 }], { yield: 10, packagingCost: 1000, variants: [{ variantId: ids.v250, pieces: 4, packagingCost: 4000, items: [] }] }));
  const box4 = getRecipe(ids.productId)!.variants.find((v) => v.variantId === ids.v250)!;
  expect(box4.suggestedPrice).toBe(Math.round(480 * 4 * 5) + 4000); // ₱136
  expect(box4.price).toBe(50000); // the product price, since the option has none
  expect(applySuggestedPrice(ids.productId, ids.v250)).toEqual({ ok: true, price: 13600 });
  const p = getProductById(ids.productId)!;
  expect(p.variants.find((v) => v.id === ids.v250)!.price).toBe(13600);
  expect(getRecipe(ids.productId)!.variants.find((v) => v.variantId === ids.v250)!.price).toBe(13600);
});

test("saving again replaces every line, base and per option", () => {
  const f = flour();
  saveRecipe(ids.productId, base([{ ingredientId: f, qty: 1 }], { variants: [{ variantId: ids.v250, pieces: 1, packagingCost: null, items: [{ ingredientId: f, qty: 1 }] }] }));
  saveRecipe(ids.productId, base([{ ingredientId: f, qty: 3 }], { yield: 2 }));
  const r = getRecipe(ids.productId)!;
  expect(r.items.map((i) => i.qty)).toEqual([3]);
  expect(r.variants.every((v) => v.items.length === 0 && v.pieces === 1)).toBe(true);
});

test.each([
  [{ yield: 0 }, "yield"], [{ yield: 1.5 }, "yield"], [{ labourMinutes: -1 }, "labourMinutes"],
  [{ packagingCost: -5 }, "packagingCost"],
])("recipe validation %j -> %s", (over, field) => {
  expect(saveRecipe(ids.productId, base([{ ingredientId: flour(), qty: 1 }], over))).toMatchObject({ ok: false, field });
});

test("recipe lines need a real ingredient or component and a positive quantity; options must belong to the product", () => {
  const f = flour();
  expect(saveRecipe(ids.productId, base([{ ingredientId: 9999, qty: 1 }]))).toMatchObject({ ok: false, field: "items" });
  expect(saveRecipe(ids.productId, base([{ componentId: 9999, qty: 1 }]))).toMatchObject({ ok: false, field: "items" });
  expect(saveRecipe(ids.productId, base([{ qty: 1 }]))).toMatchObject({ ok: false, field: "items" });
  expect(saveRecipe(ids.productId, base([{ ingredientId: f, qty: 0 }]))).toMatchObject({ ok: false, field: "items" });
  expect(saveRecipe(ids.productId, base([], { variants: [{ variantId: 9999, pieces: 1, packagingCost: null, items: [] }] }))).toMatchObject({ ok: false, field: "variants" });
  expect(saveRecipe(ids.productId, base([], { variants: [{ variantId: ids.v250, pieces: 0, packagingCost: null, items: [] }] }))).toMatchObject({ ok: false, field: "variants" });
  expect(saveRecipe(9999, base([{ ingredientId: f, qty: 1 }]))).toMatchObject({ ok: false });
  expect(saveRecipe(ids.productId, base([]))).toEqual({ ok: true });
});

test("an ingredient or component in use cannot be deleted", () => {
  const f = flour();
  const e = eggs();
  const dough = idOf(saveComponent(null, { name: "Dough", yieldQty: 100, yieldUnit: "g", notes: "", items: [{ ingredientId: f, qty: 100 }] }));
  saveRecipe(ids.productId, base([{ componentId: dough, qty: 50 }]));
  expect(deleteIngredient(f)).toMatchObject({ ok: false });
  expect(deleteComponent(dough)).toMatchObject({ ok: false });
  expect(deleteIngredient(e)).toEqual({ ok: true });
  saveRecipe(ids.productId, base([]));
  expect(deleteComponent(dough)).toEqual({ ok: true });
  expect(deleteIngredient(f)).toEqual({ ok: true });
});

test("changing an ingredient price flows through components into recipes", () => {
  const f = flour();
  const dough = idOf(saveComponent(null, { name: "Dough", yieldQty: 1000, yieldUnit: "g", notes: "", items: [{ ingredientId: f, qty: 1000 }] }));
  saveRecipe(ids.productId, base([{ componentId: dough, qty: 1000 }]));
  expect(getRecipe(ids.productId)!.cost.batchCost).toBe(4800);
  saveIngredient(f, { name: "Bread flour", unit: "g", packQty: 1000, packCost: 6000 });
  expect(getRecipe(ids.productId)!.cost.batchCost).toBe(6000);
});

test("productCosts gives the cheapest and dearest option cost per product", () => {
  const f = flour();
  expect(productCosts()).toEqual(new Map());
  saveRecipe(ids.productId, base([{ ingredientId: f, qty: 1000 }], { yield: 4, packagingCost: 100, variants: [{ variantId: ids.v500, pieces: 2, packagingCost: null, items: [] }] }));
  expect(productCosts()).toEqual(new Map([[ids.productId, { min: 1300, max: 2500 }]]));
  expect(product.price).toBe(50000);
});

test("deleting a product removes its recipe", () => {
  const f = flour();
  saveRecipe(ids.productId, base([{ ingredientId: f, qty: 1 }], { variants: [{ variantId: ids.v250, pieces: 2, packagingCost: null, items: [{ ingredientId: f, qty: 1 }] }] }));
  expect(removeProduct(ids.productId)).toBe("deleted");
  expect(getRecipe(ids.productId)).toBeNull();
  expect(deleteIngredient(f)).toEqual({ ok: true });
});
