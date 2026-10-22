"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { seedIfEmpty } from "@/lib/seed-data";

/** Loads the menu, recipes and sample orders into a shop that has no products yet. */
export async function loadStarterData(): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const result = seedIfEmpty();
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
