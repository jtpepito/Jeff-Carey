"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveRecipeAction, type RecipeFormValues } from "@/actions/recipes";
import { costRecipe } from "@/lib/costing";
import { formatPeso, parsePeso } from "@/lib/money";
import type { Ingredient } from "@/lib/recipes";

type Props = {
  productId: number; productName: string; price: number; labourRate: number;
  ingredients: Ingredient[]; initial: RecipeFormValues;
};

export function marginPercent(price: number, cost: number) {
  return price > 0 ? Math.round(((price - cost) / price) * 100) : 0;
}

export function RecipeForm({ productId, productName, price, labourRate, ingredients, initial }: Props) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const byId = new Map(ingredients.map((i) => [i.id, i]));

  // The same maths the server uses, so the numbers on screen match what gets saved.
  const cost = costRecipe(
    {
      yield: Number(v.yield) || 0,
      labourMinutes: Number(v.labourMinutes) || 0,
      packagingCost: parsePeso(v.packagingCost || "0") ?? 0,
      items: v.items.map((l) => {
        const i = byId.get(l.ingredientId);
        return { qty: Number(String(l.qty).replace(/,/g, "")) || 0, packQty: i?.packQty ?? 0, packCost: i?.packCost ?? 0 };
      }),
    },
    labourRate,
  );
  const margin = price - cost.unitCost;
  const set = <K extends keyof RecipeFormValues>(key: K, value: RecipeFormValues[K]) => setV((s) => ({ ...s, [key]: value }));
  const setLine = (n: number, patch: Partial<RecipeFormValues["items"][number]>) =>
    setV((s) => ({ ...s, items: s.items.map((l, i) => (i === n ? { ...l, ...patch } : l)) }));
  const errorFor = (field: string) => (error?.field === field ? <p className="field-error" role="alert">{error.message}</p> : null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveRecipeAction(productId, v);
      if (!result.ok) {
        setError({ field: result.field, message: result.error });
        return;
      }
      toast.success("Recipe saved");
      router.push(`/admin/products/${productId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-start">
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="batch-heading">
          <h2 id="batch-heading" className="text-xl">One batch</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="r-yield" className="field-label">Batch yield</label>
              <input id="r-yield" className="field" inputMode="numeric" value={v.yield} onChange={(e) => set("yield", e.target.value)} placeholder="12" />
              <p className="mt-1 text-sm text-muted-foreground">Units of {productName} one batch makes.</p>
              {errorFor("yield")}
            </div>
            <div>
              <label htmlFor="r-labour" className="field-label">Labour minutes</label>
              <input id="r-labour" className="field" inputMode="numeric" value={v.labourMinutes} onChange={(e) => set("labourMinutes", e.target.value)} placeholder="90" />
              <p className="mt-1 text-sm text-muted-foreground">Hands-on time per batch at {formatPeso(labourRate)}/hour.</p>
              {errorFor("labourMinutes")}
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="r-packaging" className="field-label">Packaging cost</label>
              <input id="r-packaging" className="field" inputMode="decimal" value={v.packagingCost} onChange={(e) => set("packagingCost", e.target.value)} placeholder="15" />
              <p className="mt-1 text-sm text-muted-foreground">Box, liner and label, per unit.</p>
              {errorFor("packagingCost")}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="lines-heading">
          <h2 id="lines-heading" className="text-xl">Ingredients per batch</h2>
          {ingredients.length === 0 ? (
            <p className="mt-2 text-[15px] text-muted-foreground">
              No ingredients yet. <Link href="/admin/ingredients" className="underline underline-offset-4">Add some first</Link>, then come back.
            </p>
          ) : null}
          <div className="mt-4 space-y-3">
            {v.items.map((line, n) => {
              const i = byId.get(line.ingredientId);
              return (
                <div key={n} className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1.6fr_8rem_6rem_auto] sm:items-end sm:border-0 sm:p-0">
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor={`r-ing-${n}`} className="field-label">Ingredient {n + 1}</label>
                    <select id={`r-ing-${n}`} className="field" value={line.ingredientId} onChange={(e) => setLine(n, { ingredientId: Number(e.target.value) })}>
                      <option value={0}>Choose an ingredient</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>{ing.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`r-qty-${n}`} className="field-label">Quantity {n + 1}{i ? ` (${i.unit})` : ""}</label>
                    <input id={`r-qty-${n}`} className="field" inputMode="decimal" value={line.qty} onChange={(e) => setLine(n, { qty: e.target.value })} />
                  </div>
                  <p className="self-center text-right text-sm font-medium tabular-nums sm:pb-3">
                    {i ? formatPeso(Math.round(((Number(String(line.qty).replace(/,/g, "")) || 0) / i.packQty) * i.packCost)) : "—"}
                  </p>
                  <button type="button" onClick={() => setV((s) => ({ ...s, items: s.items.filter((_, k) => k !== n) }))} className="h-12 px-2 text-sm font-medium text-destructive underline underline-offset-4" aria-label={`Remove ingredient ${n + 1}`}>
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
          {errorFor("items")}
          <button type="button" onClick={() => setV((s) => ({ ...s, items: [...s.items, { ingredientId: 0, qty: "" }] }))} className="btn btn-outline mt-4">
            Add ingredient line
          </button>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <label htmlFor="r-notes" className="field-label">Method notes</label>
          <textarea id="r-notes" className="field" rows={4} value={v.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Oven temperature, proofing time, anything the baker needs." />
        </section>
      </div>

      <div className="space-y-4 md:sticky md:top-24">
        <section data-testid="cost-summary" className="rounded-2xl border border-border bg-card p-5" aria-labelledby="cost-heading">
          <h2 id="cost-heading" className="text-xl">Cost per unit</h2>
          <dl className="mt-3 space-y-1.5 text-[15px]">
            <div className="flex justify-between"><dt className="text-muted-foreground">Ingredients (batch)</dt><dd className="tabular-nums">{formatPeso(cost.ingredientsCost)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Labour (batch)</dt><dd className="tabular-nums">{formatPeso(cost.labourCost)}</dd></div>
            <div className="flex justify-between border-t border-border pt-1.5"><dt className="text-muted-foreground">Batch cost</dt><dd className="tabular-nums">{formatPeso(cost.batchCost)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">÷ yield, + packaging</dt><dd className="tabular-nums">{formatPeso(cost.unitCost)}</dd></div>
            <div className="flex justify-between border-t border-border pt-1.5"><dt className="text-muted-foreground">Selling price</dt><dd className="tabular-nums">{formatPeso(price)}</dd></div>
            <div className="flex justify-between text-lg font-semibold">
              <dt>Margin</dt>
              <dd className={margin < 0 ? "text-destructive tabular-nums" : "tabular-nums"}>
                {formatPeso(margin)} <span className="text-sm font-medium text-muted-foreground">({marginPercent(price, cost.unitCost)}%)</span>
              </dd>
            </div>
          </dl>
          {margin < 0 ? <p className="mt-3 text-sm font-medium text-destructive">This product sells for less than it costs to make.</p> : null}
        </section>
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={pending} className="btn btn-primary flex-1">{pending ? "Saving…" : "Save recipe"}</button>
          <Link href={`/admin/products/${productId}`} className="btn btn-outline">Cancel</Link>
        </div>
      </div>
    </form>
  );
}
