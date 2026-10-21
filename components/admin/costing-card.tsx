import Link from "next/link";
import { formatPeso } from "@/lib/money";
import type { Recipe } from "@/lib/recipes";

export const marginPercent = (price: number, cost: number) => (price > 0 ? Math.round(((price - cost) / price) * 100) : 0);

/** The costing summary on a product's admin page. */
export function CostingCard({ productId, price, recipe }: { productId: number; price: number; recipe: Recipe | null }) {
  if (!recipe) {
    return (
      <section className="rounded-2xl border border-dashed border-input bg-card p-5" aria-labelledby="costing-heading">
        <h2 id="costing-heading" className="text-xl">Costing</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">No recipe yet, so there is no cost or margin for this product.</p>
        <Link href={`/admin/products/${productId}/recipe`} className="btn btn-outline mt-4">Set up recipe</Link>
      </section>
    );
  }
  const margin = price - recipe.cost.unitCost;
  return (
    <section data-testid="costing" className="rounded-2xl border border-border bg-card p-5" aria-labelledby="costing-heading">
      <h2 id="costing-heading" className="text-xl">Costing</h2>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-muted p-3">
          <dt className="text-xs text-muted-foreground">Cost per unit</dt>
          <dd className="mt-1 font-heading text-2xl tabular-nums">{formatPeso(recipe.cost.unitCost)}</dd>
        </div>
        <div className="rounded-xl bg-muted p-3">
          <dt className="text-xs text-muted-foreground">Price</dt>
          <dd className="mt-1 font-heading text-2xl tabular-nums">{formatPeso(price)}</dd>
        </div>
        <div className={margin < 0 ? "rounded-xl bg-destructive/10 p-3" : "rounded-xl bg-gold/20 p-3"}>
          <dt className="text-xs text-muted-foreground">Margin</dt>
          <dd className="mt-1 font-heading text-2xl tabular-nums">{marginPercent(price, recipe.cost.unitCost)}%</dd>
          <dd className="text-xs text-muted-foreground">{formatPeso(margin)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-muted-foreground">
        One batch makes {recipe.yield}, uses {recipe.items.length} {recipe.items.length === 1 ? "ingredient" : "ingredients"} and {recipe.labourMinutes} minutes of labour.
      </p>
      <Link href={`/admin/products/${productId}/recipe`} className="btn btn-outline mt-4">Edit recipe</Link>
    </section>
  );
}
