import { costRecipe, lineCost, type RecipeCost } from "./costing";
import { getDb, tx } from "./db";
import { getSettings } from "./settings";

export type Ingredient = { id: number; name: string; unit: string; packQty: number; packCost: number };
export type IngredientInput = Omit<Ingredient, "id">;
export type RecipeInput = {
  yield: number; labourMinutes: number; packagingCost: number; notes: string;
  items: { ingredientId: number; qty: number }[];
};
export type RecipeItem = {
  ingredientId: number; name: string; unit: string; qty: number; packQty: number; packCost: number; lineCost: number;
};
export type Recipe = Omit<RecipeInput, "items"> & { id: number; productId: number; items: RecipeItem[]; cost: RecipeCost };
export type SaveResult = { ok: true; id: number } | { ok: false; field: string; error: string };
export type Result = { ok: true } | { ok: false; field: string; error: string };

const INGREDIENT_COLS = "id, name, unit, pack_qty AS packQty, pack_cost AS packCost";
const RECIPE_COLS = "id, product_id AS productId, yield, labour_minutes AS labourMinutes, packaging_cost AS packagingCost, notes";

export function listIngredients(): Ingredient[] {
  // Rows from node:sqlite have a null prototype, which React refuses to send to client components; copy them.
  return (getDb().prepare(`SELECT ${INGREDIENT_COLS} FROM ingredients ORDER BY name COLLATE NOCASE, id`).all() as Ingredient[]).map((r) => ({ ...r }));
}

function validateIngredient(input: IngredientInput): { field: string; error: string } | null {
  if (!input.name?.trim()) return { field: "name", error: "Enter the ingredient name." };
  if (!input.unit?.trim()) return { field: "unit", error: "Enter the unit you measure it in, like g, ml or pc." };
  if (!(Number.isFinite(input.packQty) && input.packQty > 0)) return { field: "packQty", error: "Pack size must be more than 0." };
  if (!(Number.isInteger(input.packCost) && input.packCost >= 0)) return { field: "packCost", error: "Enter the pack price, 0 or more." };
  return null;
}

export function saveIngredient(id: number | null, input: IngredientInput): SaveResult {
  const bad = validateIngredient(input);
  if (bad) return { ok: false, ...bad };
  const values = [input.name.trim(), input.unit.trim(), input.packQty, input.packCost];
  if (id === null) {
    const row = getDb().prepare("INSERT INTO ingredients (name, unit, pack_qty, pack_cost) VALUES (?, ?, ?, ?)").run(...values);
    return { ok: true, id: Number(row.lastInsertRowid) };
  }
  const changed = getDb()
    .prepare("UPDATE ingredients SET name = ?, unit = ?, pack_qty = ?, pack_cost = ? WHERE id = ?")
    .run(...values, id).changes;
  return changed ? { ok: true, id } : { ok: false, field: "name", error: "This ingredient no longer exists." };
}

export function deleteIngredient(id: number): Result {
  const used = getDb().prepare("SELECT COUNT(*) AS c FROM recipe_items WHERE ingredient_id = ?").get(id) as { c: number };
  if (used.c > 0) {
    return { ok: false, field: "id", error: `It is used in ${used.c} ${used.c === 1 ? "recipe" : "recipes"}. Remove it from them first.` };
  }
  getDb().prepare("DELETE FROM ingredients WHERE id = ?").run(id);
  return { ok: true };
}

type RecipeRow = { id: number; productId: number; yield: number; labourMinutes: number; packagingCost: number; notes: string };

function itemsOf(recipeId: number): RecipeItem[] {
  const rows = getDb()
    .prepare(
      `SELECT ri.ingredient_id AS ingredientId, i.name, i.unit, ri.qty, i.pack_qty AS packQty, i.pack_cost AS packCost
       FROM recipe_items ri JOIN ingredients i ON i.id = ri.ingredient_id WHERE ri.recipe_id = ? ORDER BY ri.id`,
    )
    .all(recipeId) as Omit<RecipeItem, "lineCost">[];
  return rows.map((r) => ({ ...r, lineCost: lineCost(r) }));
}

export function getRecipe(productId: number): Recipe | null {
  const row = getDb().prepare(`SELECT ${RECIPE_COLS} FROM recipes WHERE product_id = ?`).get(productId) as RecipeRow | undefined;
  if (!row) return null;
  const items = itemsOf(row.id);
  return { ...row, items, cost: costRecipe({ ...row, items }, getSettings().labourRate) };
}

export function saveRecipe(productId: number, input: RecipeInput): Result {
  if (!Number.isInteger(input.yield) || input.yield < 1) {
    return { ok: false, field: "yield", error: "Yield is how many units one batch makes: a whole number, 1 or more." };
  }
  if (!Number.isInteger(input.labourMinutes) || input.labourMinutes < 0) {
    return { ok: false, field: "labourMinutes", error: "Labour is whole minutes, 0 or more." };
  }
  if (!Number.isInteger(input.packagingCost) || input.packagingCost < 0) {
    return { ok: false, field: "packagingCost", error: "Enter the packaging cost per unit, 0 or more." };
  }
  const items = Array.isArray(input.items) ? input.items : [];
  const known = new Set((getDb().prepare("SELECT id FROM ingredients").all() as { id: number }[]).map((r) => r.id));
  for (const line of items) {
    if (!known.has(line.ingredientId)) return { ok: false, field: "items", error: "Choose an ingredient on every line." };
    if (!(Number.isFinite(line.qty) && line.qty > 0)) return { ok: false, field: "items", error: "Every line needs a quantity above 0." };
  }
  if (!getDb().prepare("SELECT 1 FROM products WHERE id = ?").get(productId)) {
    return { ok: false, field: "product", error: "This product no longer exists." };
  }

  tx((db) => {
    db.prepare(
      `INSERT INTO recipes (product_id, yield, labour_minutes, packaging_cost, notes) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(product_id) DO UPDATE SET yield = excluded.yield, labour_minutes = excluded.labour_minutes,
         packaging_cost = excluded.packaging_cost, notes = excluded.notes`,
    ).run(productId, input.yield, input.labourMinutes, input.packagingCost, (input.notes ?? "").trim());
    const recipeId = (db.prepare("SELECT id FROM recipes WHERE product_id = ?").get(productId) as { id: number }).id;
    db.prepare("DELETE FROM recipe_items WHERE recipe_id = ?").run(recipeId);
    const add = db.prepare("INSERT INTO recipe_items (recipe_id, ingredient_id, qty) VALUES (?, ?, ?)");
    for (const line of items) add.run(recipeId, line.ingredientId, line.qty);
  });
  return { ok: true };
}

/** Unit cost of every product that has a recipe, for the products list. */
export function productCosts(): Map<number, number> {
  const rate = getSettings().labourRate;
  const recipes = getDb().prepare(`SELECT ${RECIPE_COLS} FROM recipes`).all() as RecipeRow[];
  const out = new Map<number, number>();
  for (const r of recipes) out.set(r.productId, costRecipe({ ...r, items: itemsOf(r.id) }, rate).unitCost);
  return out;
}
