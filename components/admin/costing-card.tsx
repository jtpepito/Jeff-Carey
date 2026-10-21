"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { applySuggestedPriceAction } from "@/actions/recipes";
import { formatPeso } from "@/lib/money";
import type { Recipe } from "@/lib/recipes";

export const marginPercent = (price: number, cost: number) => (price > 0 ? Math.round(((price - cost) / price) * 100) : 0);

/** The costing summary on a product's admin page: one row per option, with a one-tap suggested price. */
export function CostingCard({ productId, recipe, targetMarkup }: { productId: number; recipe: Recipe | null; targetMarkup: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!recipe) {
    return (
      <section className="rounded-2xl border border-dashed border-input bg-card p-5" aria-labelledby="costing-heading">
        <h2 id="costing-heading" className="text-xl">Costing</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">No recipe yet, so there is no cost or margin for this product.</p>
        <Link href={`/admin/products/${productId}/recipe`} className="btn btn-outline mt-4">Set up recipe</Link>
      </section>
    );
  }

  function applySuggested(variantId: number) {
    startTransition(async () => {
      const result = await applySuggestedPriceAction(productId, variantId);
      if (result.ok) toast.success(`Price set to ${formatPeso(result.price)}`);
      else toast.error(result.error);
      router.refresh();
    });
  }

  return (
    <section data-testid="costing" className="rounded-2xl border border-border bg-card p-5" aria-labelledby="costing-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="costing-heading" className="text-xl">Costing</h2>
        <p className="text-sm text-muted-foreground">
          Batch of {recipe.yield} costs {formatPeso(recipe.cost.batchCost)} ({formatPeso(Math.round(recipe.cost.perPiece))} a piece). Suggested = cost × {targetMarkup} + packaging.
        </p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[15px]">
          <thead className="text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="py-1.5 pr-3 font-semibold">Option</th>
              <th className="py-1.5 pr-3 text-right font-semibold">Cost</th>
              <th className="py-1.5 pr-3 text-right font-semibold">Price</th>
              <th className="py-1.5 pr-3 text-right font-semibold">Margin</th>
              <th className="py-1.5 pr-3 text-right font-semibold">Suggested</th>
              <th className="py-1.5" />
            </tr>
          </thead>
          <tbody>
            {recipe.variants.map((v) => (
              <tr key={v.variantId} data-testid={`costing-${v.variantId}`} className="border-t border-border">
                <td className="py-2 pr-3">
                  {v.name} <span className="text-xs text-muted-foreground">× {v.pieces}</span>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatPeso(v.cost.unitCost)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatPeso(v.price)}</td>
                <td className={`py-2 pr-3 text-right tabular-nums ${v.margin < 0 ? "font-semibold text-destructive" : ""}`}>
                  {formatPeso(v.margin)} <span className="text-xs text-muted-foreground">({marginPercent(v.price, v.cost.unitCost)}%)</span>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatPeso(v.suggestedPrice)}</td>
                <td className="py-2 text-right">
                  {v.price === v.suggestedPrice ? (
                    <span className="text-xs text-muted-foreground">in use</span>
                  ) : (
                    <button type="button" disabled={pending} onClick={() => applySuggested(v.variantId)} className="min-h-9 text-sm font-medium underline underline-offset-4" aria-label={`Use suggested price for ${v.name}`}>
                      Use
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link href={`/admin/products/${productId}/recipe`} className="btn btn-outline mt-4">Edit recipe</Link>
    </section>
  );
}
