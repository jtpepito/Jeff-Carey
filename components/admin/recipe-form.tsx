"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveRecipeAction, type LineFormValues, type RecipeFormValues } from "@/actions/recipes";
import { formatPeso, parsePeso } from "@/lib/money";
import type { Component, Ingredient } from "@/lib/recipes";

type Option = { id: number; name: string; price: number };
type Props = {
  productId: number; productName: string; options: Option[]; labourRate: number; targetMarkup: number;
  ingredients: Ingredient[]; components: Component[]; initial: RecipeFormValues;
};

const n = (s: unknown) => Number(String(s ?? "").replace(/,/g, "")) || 0;
export const marginPercent = (price: number, cost: number) => (price > 0 ? Math.round(((price - cost) / price) * 100) : 0);

export function RecipeForm({ productId, productName, options, labourRate, targetMarkup, ingredients, components, initial }: Props) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // What one unit of each pick costs, and its unit, keyed by "i:<id>" / "c:<id>".
  const picks = new Map<string, { label: string; unit: string; unitCost: number }>();
  for (const i of ingredients) picks.set(`i:${i.id}`, { label: i.name, unit: i.unit, unitCost: i.packCost / i.packQty });
  for (const c of components) picks.set(`c:${c.id}`, { label: `${c.name} (component)`, unit: c.yieldUnit, unitCost: c.unitCost });
  const lineCost = (l: LineFormValues) => Math.round(n(l.qty) * (picks.get(l.ref)?.unitCost ?? 0));
  const sum = (ls: LineFormValues[]) => ls.reduce((a, l) => a + lineCost(l), 0);

  // Same maths as the server, so what you see is what gets saved.
  const yieldN = n(v.yield);
  const labourCost = Math.round((n(v.labourMinutes) / 60) * labourRate);
  const ingredientsCost = sum(v.items);
  const batchCost = ingredientsCost + labourCost;
  const defaultPackaging = parsePeso(v.packagingCost || "0") ?? 0;
  const perOption = options.map((o) => {
    const rv = v.variants.find((x) => x.variantId === o.id) ?? { variantId: o.id, pieces: "1", packagingCost: "", items: [] };
    const pieces = Math.max(1, Math.round(n(rv.pieces) || 1));
    const packaging = rv.packagingCost.trim() ? (parsePeso(rv.packagingCost) ?? 0) : defaultPackaging;
    const piece = yieldN >= 1 ? (batchCost + sum(rv.items)) / yieldN : 0;
    const beforePackaging = Math.round(piece * pieces);
    const unitCost = beforePackaging + packaging;
    return { option: o, rv, pieces, packaging, unitCost, margin: o.price - unitCost, suggested: Math.ceil((beforePackaging * targetMarkup + packaging) / 100) * 100 };
  });

  const set = <K extends keyof RecipeFormValues>(key: K, value: RecipeFormValues[K]) => setV((s) => ({ ...s, [key]: value }));
  const setLines = (items: LineFormValues[]) => set("items", items);
  const setVariant = (variantId: number, patch: Partial<RecipeFormValues["variants"][number]>) =>
    setV((s) => {
      const existing = s.variants.find((x) => x.variantId === variantId);
      const next = { ...(existing ?? { variantId, pieces: "1", packagingCost: "", items: [] }), ...patch };
      return { ...s, variants: existing ? s.variants.map((x) => (x.variantId === variantId ? next : x)) : [...s.variants, next] };
    });
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

  const LineEditor = ({ idPrefix, lines, onChange, labelPrefix }: { idPrefix: string; lines: LineFormValues[]; onChange: (l: LineFormValues[]) => void; labelPrefix: string }) => (
    <div className="space-y-3">
      {lines.map((line, k) => (
        <div key={k} className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1.6fr_8rem_6rem_auto] sm:items-end sm:border-0 sm:p-0">
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor={`${idPrefix}-ref-${k}`} className="field-label">{labelPrefix} {k + 1}</label>
            <select id={`${idPrefix}-ref-${k}`} className="field" value={line.ref} onChange={(e) => onChange(lines.map((l, i) => (i === k ? { ...l, ref: e.target.value } : l)))}>
              <option value="">Choose an ingredient or component</option>
              {ingredients.length ? <optgroup label="Ingredients">{ingredients.map((i) => <option key={i.id} value={`i:${i.id}`}>{i.name}</option>)}</optgroup> : null}
              {components.length ? <optgroup label="Components">{components.map((c) => <option key={c.id} value={`c:${c.id}`}>{c.name}</option>)}</optgroup> : null}
            </select>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-qty-${k}`} className="field-label">Quantity {k + 1}{picks.get(line.ref) ? ` (${picks.get(line.ref)!.unit})` : ""}</label>
            <input id={`${idPrefix}-qty-${k}`} className="field" inputMode="decimal" value={line.qty} onChange={(e) => onChange(lines.map((l, i) => (i === k ? { ...l, qty: e.target.value } : l)))} />
          </div>
          <p className="self-center text-right text-sm font-medium tabular-nums sm:pb-3">{formatPeso(lineCost(line))}</p>
          <button type="button" onClick={() => onChange(lines.filter((_, i) => i !== k))} className="h-12 px-2 text-sm font-medium text-destructive underline underline-offset-4" aria-label={`Remove ${labelPrefix.toLowerCase()} ${k + 1}`}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...lines, { ref: "", qty: "" }])} className="btn btn-outline">Add {labelPrefix.toLowerCase()} line</button>
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="batch-heading">
        <h2 id="batch-heading" className="text-xl">Base batch</h2>
        <p className="text-sm text-muted-foreground">Shared by every option of {productName}.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="r-yield" className="field-label">Batch yield</label>
            <input id="r-yield" className="field" inputMode="numeric" value={v.yield} onChange={(e) => set("yield", e.target.value)} placeholder="42" />
            <p className="mt-1 text-sm text-muted-foreground">Pieces one batch makes.</p>
            {errorFor("yield")}
          </div>
          <div>
            <label htmlFor="r-labour" className="field-label">Labour minutes</label>
            <input id="r-labour" className="field" inputMode="numeric" value={v.labourMinutes} onChange={(e) => set("labourMinutes", e.target.value)} placeholder="90" />
            <p className="mt-1 text-sm text-muted-foreground">Per batch, at {formatPeso(labourRate)}/hour.</p>
            {errorFor("labourMinutes")}
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="r-packaging" className="field-label">Packaging cost</label>
            <input id="r-packaging" className="field" inputMode="decimal" value={v.packagingCost} onChange={(e) => set("packagingCost", e.target.value)} placeholder="15" />
            <p className="mt-1 text-sm text-muted-foreground">Per unit sold, unless an option overrides it.</p>
            {errorFor("packagingCost")}
          </div>
        </div>
        <div className="mt-5">
          <LineEditor idPrefix="r" lines={v.items} onChange={setLines} labelPrefix="Ingredient" />
          {errorFor("items")}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-muted p-3 text-sm sm:grid-cols-4">
          <div><dt className="text-muted-foreground">Ingredients</dt><dd className="font-medium tabular-nums">{formatPeso(ingredientsCost)}</dd></div>
          <div><dt className="text-muted-foreground">Labour</dt><dd className="font-medium tabular-nums">{formatPeso(labourCost)}</dd></div>
          <div><dt className="text-muted-foreground">Batch</dt><dd className="font-medium tabular-nums">{formatPeso(batchCost)}</dd></div>
          <div><dt className="text-muted-foreground">Per piece</dt><dd className="font-medium tabular-nums">{yieldN >= 1 ? formatPeso(Math.round(batchCost / yieldN)) : "—"}</dd></div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="options-heading">
        <h2 id="options-heading" className="text-xl">Per option</h2>
        <p className="text-sm text-muted-foreground">How many pieces each option sells, its packaging, and anything extra that goes into the batch for it.</p>
        {errorFor("variants")}
        <div className="mt-4 space-y-5">
          {perOption.map(({ option, rv, unitCost, margin, suggested }) => (
            <div key={option.id} data-testid={`option-${option.id}`} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold">{option.name}</h3>
                <p className="text-sm tabular-nums">
                  Cost <strong>{formatPeso(unitCost)}</strong> · Price {formatPeso(option.price)} ·{" "}
                  <span className={margin < 0 ? "font-semibold text-destructive" : "font-semibold"}>Margin {formatPeso(margin)} ({marginPercent(option.price, unitCost)}%)</span>
                  {" "}· Suggested {formatPeso(suggested)}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-sm">
                <div>
                  <label htmlFor={`o-pieces-${option.id}`} className="field-label">Pieces per unit</label>
                  <input id={`o-pieces-${option.id}`} className="field" inputMode="numeric" value={rv.pieces} onChange={(e) => setVariant(option.id, { pieces: e.target.value })} />
                </div>
                <div>
                  <label htmlFor={`o-pack-${option.id}`} className="field-label">Packaging override</label>
                  <input id={`o-pack-${option.id}`} className="field" inputMode="decimal" value={rv.packagingCost} onChange={(e) => setVariant(option.id, { packagingCost: e.target.value })} placeholder={`Default ${formatPeso(defaultPackaging)}`} />
                </div>
              </div>
              <div className="mt-3">
                <LineEditor idPrefix={`o-${option.id}`} lines={rv.items} onChange={(items) => setVariant(option.id, { items })} labelPrefix={`${option.name} extra`} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <label htmlFor="r-notes" className="field-label">Method notes</label>
        <textarea id="r-notes" className="field" rows={4} value={v.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Oven temperature, proofing time, anything the baker needs." />
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary flex-1 sm:flex-none">{pending ? "Saving…" : "Save recipe"}</button>
        <Link href={`/admin/products/${productId}`} className="btn btn-outline">Cancel</Link>
      </div>
    </form>
  );
}
