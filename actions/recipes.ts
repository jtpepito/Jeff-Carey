"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { parsePeso } from "@/lib/money";
import { deleteIngredient, saveIngredient, saveRecipe, type Result, type SaveResult } from "@/lib/recipes";

export type IngredientFormValues = { name: string; unit: string; packQty: string; packCost: string };
export type RecipeFormValues = {
  yield: string; labourMinutes: string; packagingCost: string; notes: string;
  items: { ingredientId: number; qty: string }[];
};

const num = (s: string) => Number(String(s ?? "").trim().replace(/,/g, ""));
const whole = (s: string) => (/^\d+$/.test(String(s ?? "").trim()) ? Number(String(s).trim()) : NaN);

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

export async function saveRecipeAction(productId: number, v: RecipeFormValues): Promise<Result> {
  await requireAdmin();
  const packagingCost = parsePeso(String(v?.packagingCost ?? "") || "0");
  if (packagingCost === null) return { ok: false, field: "packagingCost", error: "Enter the packaging cost like 12 or 12.50." };
  const result = saveRecipe(productId, {
    yield: whole(v?.yield),
    labourMinutes: whole(String(v?.labourMinutes ?? "") || "0"),
    packagingCost,
    notes: String(v?.notes ?? "").slice(0, 2000),
    items: (Array.isArray(v?.items) ? v.items : []).map((i) => ({ ingredientId: Number(i.ingredientId), qty: num(i.qty) })),
  });
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}
