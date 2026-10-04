"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { toProductInput, type ProductFormValues } from "@/lib/product-form";
import { createProduct, removeProduct, updateProduct, type SaveResult } from "@/lib/products";

export async function saveProduct(id: number | null, values: ProductFormValues): Promise<SaveResult> {
  await requireAdmin();
  const parsed = toProductInput(values);
  if (!parsed.ok) return parsed;
  const result = id === null ? createProduct(parsed.input) : updateProduct(id, parsed.input);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function deleteProduct(id: number): Promise<"deleted" | "deactivated"> {
  await requireAdmin();
  const outcome = removeProduct(id);
  revalidatePath("/", "layout");
  return outcome;
}
