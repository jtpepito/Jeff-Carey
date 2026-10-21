import type { Metadata } from "next";
import { IngredientsManager } from "@/components/admin/ingredients-manager";
import { listIngredients } from "@/lib/recipes";

export const metadata: Metadata = { title: "Ingredients" };

export default function IngredientsPage() {
  return (
    <>
      <h1 className="text-3xl">Ingredients</h1>
      <p className="mt-1 mb-5 text-[15px] text-muted-foreground">Prices here feed every recipe. Update a pack price and all costs follow.</p>
      <IngredientsManager ingredients={listIngredients()} />
    </>
  );
}
