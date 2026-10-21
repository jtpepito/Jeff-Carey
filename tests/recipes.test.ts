import { beforeEach, expect, test } from "vitest";
import { deleteIngredient, getRecipe, listIngredients, productCosts, saveIngredient, saveRecipe } from "@/lib/recipes";
import { removeProduct } from "@/lib/products";
import { updateSettings } from "@/lib/settings";
import { ids, product, setupShop } from "./order-fixtures";

beforeEach(setupShop);

const idOf = (r: { ok: true; id: number } | { ok: false }) => (r as { id: number }).id;
const flour = () => idOf(saveIngredient(null, { name: "Bread flour", unit: "g", packQty: 1000, packCost: 4800 }));
const eggs = () => idOf(saveIngredient(null, { name: "Eggs", unit: "pc", packQty: 1, packCost: 900 }));
const recipe = (items: { ingredientId: number; qty: number }[], over = {}) => ({
  yield: 1, labourMinutes: 0, packagingCost: 0, notes: "", items, ...over,
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

test("a recipe is saved per product and read back with its lines and cost", () => {
  updateSettings({ labourRate: 8000 });
  const f = flour();
  const e = eggs();
  expect(getRecipe(ids.productId)).toBeNull();
  const r = saveRecipe(ids.productId, recipe([{ ingredientId: f, qty: 500 }, { ingredientId: e, qty: 2 }], { yield: 12, labourMinutes: 90, packagingCost: 1500, notes: "Proof overnight." }));
  expect(r).toEqual({ ok: true });
  const saved = getRecipe(ids.productId)!;
  expect(saved).toMatchObject({ productId: ids.productId, yield: 12, labourMinutes: 90, packagingCost: 1500, notes: "Proof overnight." });
  expect(saved.items.map((i) => [i.ingredientId, i.name, i.unit, i.qty, i.lineCost])).toEqual([[f, "Bread flour", "g", 500, 2400], [e, "Eggs", "pc", 2, 1800]]);
  // (2400 + 1800 + 12000) / 12 + 1500
  expect(saved.cost).toMatchObject({ ingredientsCost: 4200, labourCost: 12000, batchCost: 16200, unitCost: 1350 + 1500 });
});

test("saving again replaces the lines instead of adding to them", () => {
  const f = flour();
  saveRecipe(ids.productId, recipe([{ ingredientId: f, qty: 1 }]));
  saveRecipe(ids.productId, recipe([{ ingredientId: f, qty: 3 }], { yield: 2 }));
  expect(getRecipe(ids.productId)!.items.map((i) => i.qty)).toEqual([3]);
  expect(getRecipe(ids.productId)!.yield).toBe(2);
});

test.each([
  [{ yield: 0 }, "yield"], [{ yield: 1.5 }, "yield"], [{ labourMinutes: -1 }, "labourMinutes"],
  [{ packagingCost: -5 }, "packagingCost"], [{ packagingCost: 2.5 }, "packagingCost"],
])("recipe validation %j -> %s", (over, field) => {
  expect(saveRecipe(ids.productId, recipe([{ ingredientId: flour(), qty: 1 }], over))).toMatchObject({ ok: false, field });
});

test("recipe lines need a real ingredient and a positive quantity", () => {
  const f = flour();
  expect(saveRecipe(ids.productId, recipe([{ ingredientId: 9999, qty: 1 }]))).toMatchObject({ ok: false, field: "items" });
  expect(saveRecipe(ids.productId, recipe([{ ingredientId: f, qty: 0 }]))).toMatchObject({ ok: false, field: "items" });
  expect(saveRecipe(9999, recipe([{ ingredientId: f, qty: 1 }]))).toMatchObject({ ok: false });
  expect(saveRecipe(ids.productId, recipe([]))).toEqual({ ok: true }); // an empty recipe is allowed while it is being set up
});

test("an ingredient used by a recipe cannot be deleted; an unused one can", () => {
  const f = flour();
  const e = eggs();
  saveRecipe(ids.productId, recipe([{ ingredientId: f, qty: 1 }]));
  expect(deleteIngredient(f)).toMatchObject({ ok: false });
  expect(deleteIngredient(e)).toEqual({ ok: true });
  expect(listIngredients().map((i) => i.id)).toEqual([f]);
});

test("changing an ingredient price changes every recipe that uses it", () => {
  const f = flour();
  saveRecipe(ids.productId, recipe([{ ingredientId: f, qty: 1000 }]));
  expect(getRecipe(ids.productId)!.cost.unitCost).toBe(4800);
  saveIngredient(f, { name: "Bread flour", unit: "g", packQty: 1000, packCost: 6000 });
  expect(getRecipe(ids.productId)!.cost.unitCost).toBe(6000);
});

test("productCosts gives the unit cost for products with a recipe, keyed by product id", () => {
  const f = flour();
  expect(productCosts()).toEqual(new Map());
  saveRecipe(ids.productId, recipe([{ ingredientId: f, qty: 1000 }], { yield: 4, packagingCost: 100 }));
  expect(productCosts()).toEqual(new Map([[ids.productId, 1300]]));
  expect(product.price - 1300).toBe(48700);
});

test("deleting a product removes its recipe", () => {
  const f = flour();
  saveRecipe(ids.productId, recipe([{ ingredientId: f, qty: 1 }]));
  expect(removeProduct(ids.productId)).toBe("deleted");
  expect(getRecipe(ids.productId)).toBeNull();
  expect(deleteIngredient(f)).toEqual({ ok: true });
});
