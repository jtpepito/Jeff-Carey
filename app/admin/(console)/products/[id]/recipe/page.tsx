import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeForm } from "@/components/admin/recipe-form";
import { pesoInputValue } from "@/lib/money";
import { variantPrice } from "@/lib/pricing";
import { getProductById } from "@/lib/products";
import { getRecipe, listComponents, listIngredients, type Line } from "@/lib/recipes";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Recipe" };

const toForm = (lines: Line[]) =>
  lines.map((l) => ({ ref: l.ingredientId != null ? `i:${l.ingredientId}` : `c:${l.componentId}`, qty: String(l.qty) }));

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const product = getProductById(Number((await params).id));
  if (!product) notFound();
  const recipe = getRecipe(product.id);
  const settings = getSettings();

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
        options={product.variants.map((v) => ({ id: v.id, name: v.name, price: variantPrice(product, v) }))}
        labourRate={settings.labourRate}
        targetMarkup={settings.targetMarkup}
        ingredients={listIngredients()}
        components={listComponents()}
        initial={
          recipe
            ? {
                yield: String(recipe.yield), labourMinutes: String(recipe.labourMinutes),
                packagingCost: pesoInputValue(recipe.packagingCost), notes: recipe.notes,
                items: toForm(recipe.items),
                variants: recipe.variants.map((rv) => ({
                  variantId: rv.variantId, pieces: String(rv.pieces),
                  packagingCost: rv.packagingOverridden ? pesoInputValue(rv.packagingCost) : "",
                  items: toForm(rv.items),
                })),
              }
            : { yield: "", labourMinutes: "", packagingCost: "", notes: "", items: [{ ref: "", qty: "" }], variants: [] }
        }
      />
    </>
  );
}
