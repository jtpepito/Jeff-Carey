"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { applySeedPhotos, seedIfEmpty } from "@/lib/seed-data";

/** Replaces stand-in photos on the seeded products with the ones in public/products. */
export async function applyShippedPhotos(): Promise<{ changed: number }> {
  await requireAdmin();
  const changed = applySeedPhotos();
  if (changed) revalidatePath("/", "layout");
  return { changed };
}

/** Loads the menu, recipes and sample orders into a shop that has no products yet. */
export async function loadStarterData(): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const result = seedIfEmpty();
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
