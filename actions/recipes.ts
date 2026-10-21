"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { parsePeso } from "@/lib/money";
import {
  applySuggestedPrice, deleteComponent, deleteIngredient, saveComponent, saveIngredient, saveRecipe,
  type LineInput, type Result, type SaveResult,
} from "@/lib/recipes";

export type IngredientFormValues = { name: string; unit: string; packQty: string; packCost: string };
export type ComponentFormValues = { name: string; yieldQty: string; yieldUnit: string; notes: string; items: { ingredientId: number; qty: string }[] };
/** A line's `ref` is "i:<ingredient id>" or "c:<component id>". */
export type LineFormValues = { ref: string; qty: string };
export type RecipeFormValues = {
  yield: string; labourMinutes: string; packagingCost: string; notes: string;
  items: LineFormValues[];
  variants: { variantId: number; pieces: string; packagingCost: string; items: LineFormValues[] }[];
};

const num = (s: unknown) => Number(String(s ?? "").trim().replace(/,/g, ""));
const whole = (s: unknown) => (/^\d+$/.test(String(s ?? "").trim()) ? Number(String(s).trim()) : NaN);

export async function saveIngredientAction(id: number | null, v: IngredientFormValues): Promise<SaveResult> {
  await requireAdmin();
  const packCost = parsePeso(String(v?.packCost ?? ""));
  if (packCost === null) return { ok: false, field: "packCost", error: "Enter the pack price like 48 or 1,250.50." };
  const result = saveIngredient(id, { name: String(v?.name ?? ""), unit: String(v?.unit ?? ""), packQty: num(v?.packQty), packCost });
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}

export async function deleteIngredientAction(id: number): Promise<Result> {
  await requireAdmin();
  const result = deleteIngredient(id);
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}

export async function saveComponentAction(id: number | null, v: ComponentFormValues): Promise<SaveResult> {
  await requireAdmin();
  const result = saveComponent(id, {
    name: String(v?.name ?? ""), yieldQty: num(v?.yieldQty), yieldUnit: String(v?.yieldUnit ?? ""), notes: String(v?.notes ?? "").slice(0, 2000),
    items: (Array.isArray(v?.items) ? v.items : []).map((i) => ({ ingredientId: Number(i.ingredientId), qty: num(i.qty) })),
  });
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}

export async function deleteComponentAction(id: number): Promise<Result> {
  await requireAdmin();
  const result = deleteComponent(id);
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}

export async function lineFromForm(l: LineFormValues): Promise<LineInput> {
  const [kind, id] = String(l?.ref ?? "").split(":");
  return { ingredientId: kind === "i" ? Number(id) : null, componentId: kind === "c" ? Number(id) : null, qty: num(l?.qty) };
}

export async function saveRecipeAction(productId: number, v: RecipeFormValues): Promise<Result> {
  await requireAdmin();
  const packagingCost = parsePeso(String(v?.packagingCost ?? "") || "0");
  if (packagingCost === null) return { ok: false, field: "packagingCost", error: "Enter the packaging cost like 12 or 12.50." };
  const lines = async (ls: LineFormValues[] | undefined) => Promise.all((Array.isArray(ls) ? ls : []).map(lineFromForm));
  const variants = [];
  for (const rv of Array.isArray(v?.variants) ? v.variants : []) {
    const override = String(rv?.packagingCost ?? "").trim();
    const vp = override ? parsePeso(override) : null;
    if (override && vp === null) return { ok: false, field: "variants", error: "An option packaging cost must look like 28 or 28.50, or be blank." };
    variants.push({ variantId: Number(rv.variantId), pieces: whole(String(rv?.pieces ?? "") || "1"), packagingCost: vp, items: await lines(rv.items) });
  }
  const result = saveRecipe(productId, {
    yield: whole(v?.yield),
    labourMinutes: whole(String(v?.labourMinutes ?? "") || "0"),
    packagingCost,
    notes: String(v?.notes ?? "").slice(0, 2000),
    items: await lines(v?.items),
    variants,
  });
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}

export async function applySuggestedPriceAction(productId: number, variantId: number): Promise<{ ok: true; price: number } | { ok: false; field: string; error: string }> {
  await requireAdmin();
  const result = applySuggestedPrice(Number(productId), Number(variantId));
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
