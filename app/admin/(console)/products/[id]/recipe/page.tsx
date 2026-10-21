import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeForm } from "@/components/admin/recipe-form";
import { pesoInputValue } from "@/lib/money";
import { getProductById } from "@/lib/products";
import { getRecipe, listIngredients } from "@/lib/recipes";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Recipe" };

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const product = getProductById(Number((await params).id));
  if (!product) notFound();
  const recipe = getRecipe(product.id);

  return (
    <>
      <Link href={`/admin/products/${product.id}`} className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground hover:text-foreground">
        ← {product.name}
      </Link>
      <h1 className="mt-1 text-3xl">Recipe and costing</h1>
      <RecipeForm
        key={JSON.stringify(recipe)}
        productId={product.id}
        productName={product.name}
        price={product.price}
        labourRate={getSettings().labourRate}
        ingredients={listIngredients()}
        initial={
          recipe
            ? {
                yield: String(recipe.yield), labourMinutes: String(recipe.labourMinutes),
                packagingCost: pesoInputValue(recipe.packagingCost), notes: recipe.notes,
                items: recipe.items.map((i) => ({ ingredientId: i.ingredientId, qty: String(i.qty) })),
              }
            : { yield: "", labourMinutes: "", packagingCost: "", notes: "", items: [{ ingredientId: 0, qty: "" }] }
        }
      />
    </>
  );
}
