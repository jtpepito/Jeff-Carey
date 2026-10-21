import { lineCost, type CostLine } from "./costing";
import { getDb, tx } from "./db";
import { getSettings } from "./settings";

export type Ingredient = { id: number; name: string; unit: string; packQty: number; packCost: number };
export type IngredientInput = Omit<Ingredient, "id">;

/** A line of a component or recipe: one ingredient or one component, and how much of it. */
export type LineInput = { ingredientId?: number | null; componentId?: number | null; qty: number };
export type Line = {
  ingredientId: number | null; componentId: number | null; name: string; unit: string; qty: number;
  /** centavos per one unit of qty, possibly fractional */
  unitCost: number;
  lineCost: number;
};

export type ComponentInput = { name: string; yieldQty: number; yieldUnit: string; notes: string; items: { ingredientId: number; qty: number }[] };
export type Component = Omit<ComponentInput, "items"> & { id: number; items: Line[]; batchCost: number; unitCost: number };

export type RecipeVariantInput = { variantId: number; pieces: number; packagingCost: number | null; items: LineInput[] };
export type RecipeInput = {
  yield: number; labourMinutes: number; packagingCost: number; notes: string;
  items: LineInput[]; variants: RecipeVariantInput[];
};
export type RecipeVariant = {
  variantId: number; name: string; pieces: number;
  /** the packaging actually used: the override, or the recipe default */
  packagingCost: number;
  /** true when this option has its own packaging figure rather than the recipe default */
  packagingOverridden: boolean;
  items: Line[];
  cost: { extraBatchCost: number; perPiece: number; unitCost: number };
  price: number; margin: number; suggestedPrice: number;
};
export type Recipe = {
  id: number; productId: number; yield: number; labourMinutes: number; packagingCost: number; notes: string;
  items: Line[];
  cost: { ingredientsCost: number; labourCost: number; batchCost: number; perPiece: number };
  variants: RecipeVariant[];
};
export type SaveResult = { ok: true; id: number } | { ok: false; field: string; error: string };
export type Result = { ok: true } | { ok: false; field: string; error: string };

const fail = (field: string, error: string): { ok: false; field: string; error: string } => ({ ok: false, field, error });
const INGREDIENT_COLS = "id, name, unit, pack_qty AS packQty, pack_cost AS packCost";

// ---------- ingredients ----------

export function listIngredients(): Ingredient[] {
  // Rows from node:sqlite have a null prototype, which React refuses to send to client components; copy them.
  return (getDb().prepare(`SELECT ${INGREDIENT_COLS} FROM ingredients ORDER BY name COLLATE NOCASE, id`).all() as Ingredient[]).map((r) => ({ ...r }));
}

export function saveIngredient(id: number | null, input: IngredientInput): SaveResult {
  if (!input.name?.trim()) return fail("name", "Enter the ingredient name.");
  if (!input.unit?.trim()) return fail("unit", "Enter the unit you measure it in, like g, ml or pc.");
  if (!(Number.isFinite(input.packQty) && input.packQty > 0)) return fail("packQty", "Pack size must be more than 0.");
  if (!(Number.isInteger(input.packCost) && input.packCost >= 0)) return fail("packCost", "Enter the pack price, 0 or more.");
  const values = [input.name.trim(), input.unit.trim(), input.packQty, input.packCost];
  if (id === null) {
    const row = getDb().prepare("INSERT INTO ingredients (name, unit, pack_qty, pack_cost) VALUES (?, ?, ?, ?)").run(...values);
    return { ok: true, id: Number(row.lastInsertRowid) };
  }
  const changed = getDb().prepare("UPDATE ingredients SET name = ?, unit = ?, pack_qty = ?, pack_cost = ? WHERE id = ?").run(...values, id).changes;
  return changed ? { ok: true, id } : fail("name", "This ingredient no longer exists.");
}

export function deleteIngredient(id: number): Result {
  const inRecipes = (getDb().prepare("SELECT COUNT(*) AS c FROM recipe_lines WHERE ingredient_id = ?").get(id) as { c: number }).c;
  const inComponents = (getDb().prepare("SELECT COUNT(*) AS c FROM component_items WHERE ingredient_id = ?").get(id) as { c: number }).c;
  if (inRecipes + inComponents > 0) {
    const where = [
      inRecipes ? `${inRecipes} recipe ${inRecipes === 1 ? "line" : "lines"}` : "",
      inComponents ? `${inComponents} component ${inComponents === 1 ? "line" : "lines"}` : "",
    ].filter(Boolean).join(" and ");
    return fail("id", `It is used in ${where}. Remove it from them first.`);
  }
  getDb().prepare("DELETE FROM ingredients WHERE id = ?").run(id);
  return { ok: true };
}

// ---------- components (sub-recipes) ----------

type ComponentRow = { id: number; name: string; yieldQty: number; yieldUnit: string; notes: string };
const COMPONENT_COLS = "id, name, yield_qty AS yieldQty, yield_unit AS yieldUnit, notes";

function componentLines(componentId: number): Line[] {
  const rows = getDb()
    .prepare(
      `SELECT ci.ingredient_id AS ingredientId, i.name, i.unit, ci.qty, i.pack_qty AS packQty, i.pack_cost AS packCost
       FROM component_items ci JOIN ingredients i ON i.id = ci.ingredient_id WHERE ci.component_id = ? ORDER BY ci.id`,
    )
    .all(componentId) as { ingredientId: number; name: string; unit: string; qty: number; packQty: number; packCost: number }[];
  return rows.map((r) => ({
    ingredientId: r.ingredientId, componentId: null, name: r.name, unit: r.unit, qty: r.qty,
    unitCost: r.packCost / r.packQty, lineCost: lineCost(r),
  }));
}

function hydrateComponent(row: ComponentRow): Component {
  const items = componentLines(row.id);
  const batchCost = items.reduce((sum, l) => sum + l.lineCost, 0);
  return { ...row, items, batchCost, unitCost: row.yieldQty > 0 ? batchCost / row.yieldQty : 0 };
}

export function listComponents(): Component[] {
  const rows = getDb().prepare(`SELECT ${COMPONENT_COLS} FROM components ORDER BY name COLLATE NOCASE, id`).all() as ComponentRow[];
  return rows.map((r) => hydrateComponent({ ...r }));
}

export function getComponent(id: number): Component | null {
  const row = getDb().prepare(`SELECT ${COMPONENT_COLS} FROM components WHERE id = ?`).get(id) as ComponentRow | undefined;
  return row ? hydrateComponent({ ...row }) : null;
}

export function saveComponent(id: number | null, input: ComponentInput): SaveResult {
  if (!input.name?.trim()) return fail("name", "Enter the component name, like Sweet dough or Cream cheese topping.");
  if (!(Number.isFinite(input.yieldQty) && input.yieldQty > 0)) return fail("yieldQty", "Yield is how much one batch makes: more than 0.");
  if (!input.yieldUnit?.trim()) return fail("yieldUnit", "Enter the unit the yield is measured in, like g or pc.");
  const items = Array.isArray(input.items) ? input.items : [];
  const known = new Set((getDb().prepare("SELECT id FROM ingredients").all() as { id: number }[]).map((r) => r.id));
  for (const line of items) {
    if (!known.has(line.ingredientId)) return fail("items", "Choose an ingredient on every line.");
    if (!(Number.isFinite(line.qty) && line.qty > 0)) return fail("items", "Every line needs a quantity above 0.");
  }
  const values = [input.name.trim(), input.yieldQty, input.yieldUnit.trim(), (input.notes ?? "").trim()];
  return tx((db) => {
    let componentId = id;
    if (componentId === null) {
      componentId = Number(db.prepare("INSERT INTO components (name, yield_qty, yield_unit, notes) VALUES (?, ?, ?, ?)").run(...values).lastInsertRowid);
    } else {
      const changed = db.prepare("UPDATE components SET name = ?, yield_qty = ?, yield_unit = ?, notes = ? WHERE id = ?").run(...values, componentId).changes;
      if (!changed) return fail("name", "This component no longer exists.");
      db.prepare("DELETE FROM component_items WHERE component_id = ?").run(componentId);
    }
    const add = db.prepare("INSERT INTO component_items (component_id, ingredient_id, qty) VALUES (?, ?, ?)");
    for (const line of items) add.run(componentId, line.ingredientId, line.qty);
    return { ok: true as const, id: componentId };
  });
}

export function deleteComponent(id: number): Result {
  const used = (getDb().prepare("SELECT COUNT(*) AS c FROM recipe_lines WHERE component_id = ?").get(id) as { c: number }).c;
  if (used > 0) return fail("id", `It is used in ${used} recipe ${used === 1 ? "line" : "lines"}. Remove it from them first.`);
  getDb().prepare("DELETE FROM components WHERE id = ?").run(id);
  return { ok: true };
}

// ---------- recipes ----------

type RecipeRow = { id: number; productId: number; yield: number; labourMinutes: number; packagingCost: number; notes: string };
const RECIPE_COLS = "id, product_id AS productId, yield, labour_minutes AS labourMinutes, packaging_cost AS packagingCost, notes";

/** Lines of a recipe: the base batch (variantId null) or one option's extras. */
function recipeLines(recipeId: number, variantId: number | null): Line[] {
  const rows = getDb()
    .prepare(
      `SELECT rl.ingredient_id AS ingredientId, rl.component_id AS componentId, rl.qty,
              i.name AS iname, i.unit AS iunit, i.pack_qty AS packQty, i.pack_cost AS packCost,
              c.name AS cname, c.yield_unit AS cunit, c.id AS cid
       FROM recipe_lines rl
       LEFT JOIN ingredients i ON i.id = rl.ingredient_id
       LEFT JOIN components c ON c.id = rl.component_id
       WHERE rl.recipe_id = ? AND rl.variant_id IS ? ORDER BY rl.id`,
    )
    .all(recipeId, variantId) as {
      ingredientId: number | null; componentId: number | null; qty: number;
      iname: string | null; iunit: string | null; packQty: number | null; packCost: number | null;
      cname: string | null; cunit: string | null; cid: number | null;
    }[];
  return rows.map((r) => {
    if (r.ingredientId != null) {
      const l: CostLine = { qty: r.qty, packQty: r.packQty ?? 0, packCost: r.packCost ?? 0 };
      return {
        ingredientId: r.ingredientId, componentId: null, name: r.iname ?? "", unit: r.iunit ?? "", qty: r.qty,
        unitCost: l.packQty > 0 ? l.packCost / l.packQty : 0, lineCost: lineCost(l),
      };
    }
    const unitCost = r.cid != null ? (getComponent(r.cid)?.unitCost ?? 0) : 0;
    return { ingredientId: null, componentId: r.componentId, name: r.cname ?? "", unit: r.cunit ?? "", qty: r.qty, unitCost, lineCost: Math.round(r.qty * unitCost) };
  });
}

type VariantSetting = { variantId: number; pieces: number; packagingCost: number | null };

function hydrateRecipe(row: RecipeRow): Recipe {
  const { labourRate, targetMarkup } = getSettings();
  const items = recipeLines(row.id, null);
  const ingredientsCost = items.reduce((sum, l) => sum + l.lineCost, 0);
  const labourCost = Math.round((Math.max(0, row.labourMinutes) / 60) * labourRate);
  const batchCost = ingredientsCost + labourCost;
  const perPiece = row.yield >= 1 ? batchCost / row.yield : 0;

  const product = getDb().prepare("SELECT price FROM products WHERE id = ?").get(row.productId) as { price: number };
  const productVariants = getDb()
    .prepare("SELECT id, name, price FROM variants WHERE product_id = ? ORDER BY id")
    .all(row.productId) as { id: number; name: string; price: number | null }[];
  const settings = new Map(
    (getDb().prepare("SELECT variant_id AS variantId, pieces, packaging_cost AS packagingCost FROM recipe_variants WHERE recipe_id = ?").all(row.id) as VariantSetting[])
      .map((s) => [s.variantId, s]),
  );

  const variants: RecipeVariant[] = productVariants.map((v) => {
    const s = settings.get(v.id);
    const pieces = s?.pieces ?? 1;
    const packagingOverridden = s?.packagingCost != null;
    const packagingCost = s?.packagingCost ?? row.packagingCost;
    const extras = recipeLines(row.id, v.id);
    const extraBatchCost = extras.reduce((sum, l) => sum + l.lineCost, 0);
    const piece = row.yield >= 1 ? (batchCost + extraBatchCost) / row.yield : 0;
    const beforePackaging = Math.round(piece * pieces);
    const price = v.price ?? product.price;
    const unitCost = beforePackaging + packagingCost;
    return {
      variantId: v.id, name: v.name, pieces, packagingCost, packagingOverridden, items: extras,
      cost: { extraBatchCost, perPiece: piece, unitCost },
      price, margin: price - unitCost,
      // Whole pesos, rounded up, so a suggestion is never a few centavos under cost × markup.
      suggestedPrice: Math.ceil((beforePackaging * targetMarkup + packagingCost) / 100) * 100,
    };
  });

  return { ...row, items, cost: { ingredientsCost, labourCost, batchCost, perPiece }, variants };
}

export function getRecipe(productId: number): Recipe | null {
  const row = getDb().prepare(`SELECT ${RECIPE_COLS} FROM recipes WHERE product_id = ?`).get(productId) as RecipeRow | undefined;
  return row ? hydrateRecipe({ ...row }) : null;
}

type Known = { ingredients: Set<number>; components: Set<number> };

function validateLines(lines: LineInput[], known: Known): { field: string; error: string } | null {
  for (const line of lines) {
    const hasIngredient = line.ingredientId != null && known.ingredients.has(line.ingredientId);
    const hasComponent = line.componentId != null && known.components.has(line.componentId);
    if (hasIngredient === hasComponent) return { field: "items", error: "Choose an ingredient or a component on every line." };
    if (!(Number.isFinite(line.qty) && line.qty > 0)) return { field: "items", error: "Every line needs a quantity above 0." };
  }
  return null;
}

export function saveRecipe(productId: number, input: RecipeInput): Result {
  if (!Number.isInteger(input.yield) || input.yield < 1) return fail("yield", "Yield is how many pieces one batch makes: a whole number, 1 or more.");
  if (!Number.isInteger(input.labourMinutes) || input.labourMinutes < 0) return fail("labourMinutes", "Labour is whole minutes, 0 or more.");
  if (!Number.isInteger(input.packagingCost) || input.packagingCost < 0) return fail("packagingCost", "Enter the packaging cost per unit sold, 0 or more.");
  if (!getDb().prepare("SELECT 1 FROM products WHERE id = ?").get(productId)) return fail("product", "This product no longer exists.");

  const known: Known = {
    ingredients: new Set((getDb().prepare("SELECT id FROM ingredients").all() as { id: number }[]).map((r) => r.id)),
    components: new Set((getDb().prepare("SELECT id FROM components").all() as { id: number }[]).map((r) => r.id)),
  };
  const items = Array.isArray(input.items) ? input.items : [];
  const bad = validateLines(items, known);
  if (bad) return { ok: false, ...bad };

  const ownVariants = new Set((getDb().prepare("SELECT id FROM variants WHERE product_id = ?").all(productId) as { id: number }[]).map((r) => r.id));
  const variants = Array.isArray(input.variants) ? input.variants : [];
  for (const v of variants) {
    if (!ownVariants.has(v.variantId)) return fail("variants", "One of the options no longer belongs to this product.");
    if (!Number.isInteger(v.pieces) || v.pieces < 1) return fail("variants", "Pieces per unit sold must be a whole number, 1 or more.");
    if (v.packagingCost != null && (!Number.isInteger(v.packagingCost) || v.packagingCost < 0)) return fail("variants", "An option packaging cost must be 0 or more, or blank.");
    const badLine = validateLines(Array.isArray(v.items) ? v.items : [], known);
    if (badLine) return fail("variants", badLine.error);
  }

  tx((db) => {
    db.prepare(
      `INSERT INTO recipes (product_id, yield, labour_minutes, packaging_cost, notes) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(product_id) DO UPDATE SET yield = excluded.yield, labour_minutes = excluded.labour_minutes,
         packaging_cost = excluded.packaging_cost, notes = excluded.notes`,
    ).run(productId, input.yield, input.labourMinutes, input.packagingCost, (input.notes ?? "").trim());
    const recipeId = (db.prepare("SELECT id FROM recipes WHERE product_id = ?").get(productId) as { id: number }).id;
    db.prepare("DELETE FROM recipe_lines WHERE recipe_id = ?").run(recipeId);
    db.prepare("DELETE FROM recipe_variants WHERE recipe_id = ?").run(recipeId);
    const addLine = db.prepare("INSERT INTO recipe_lines (recipe_id, variant_id, ingredient_id, component_id, qty) VALUES (?, ?, ?, ?, ?)");
    for (const l of items) addLine.run(recipeId, null, l.ingredientId ?? null, l.componentId ?? null, l.qty);
    const addVariant = db.prepare("INSERT INTO recipe_variants (recipe_id, variant_id, pieces, packaging_cost) VALUES (?, ?, ?, ?)");
    for (const v of variants) {
      addVariant.run(recipeId, v.variantId, v.pieces, v.packagingCost ?? null);
      for (const l of Array.isArray(v.items) ? v.items : []) addLine.run(recipeId, v.variantId, l.ingredientId ?? null, l.componentId ?? null, l.qty);
    }
  });
  return { ok: true };
}

/** Sets an option's price to the recipe's suggested price. */
export function applySuggestedPrice(productId: number, variantId: number): { ok: true; price: number } | { ok: false; field: string; error: string } {
  const recipe = getRecipe(productId);
  const v = recipe?.variants.find((x) => x.variantId === variantId);
  if (!v) return fail("variants", "No recipe or option found.");
  getDb().prepare("UPDATE variants SET price = ? WHERE id = ? AND product_id = ?").run(v.suggestedPrice, variantId, productId);
  return { ok: true, price: v.suggestedPrice };
}

/** Cheapest and dearest unit cost across each product's options, for the products list. */
export function productCosts(): Map<number, { min: number; max: number }> {
  const rows = getDb().prepare(`SELECT ${RECIPE_COLS} FROM recipes`).all() as RecipeRow[];
  const out = new Map<number, { min: number; max: number }>();
  for (const row of rows) {
    const costs = hydrateRecipe({ ...row }).variants.map((v) => v.cost.unitCost);
    if (costs.length) out.set(row.productId, { min: Math.min(...costs), max: Math.max(...costs) });
  }
  return out;
}
