"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteIngredientAction, saveIngredientAction, type IngredientFormValues } from "@/actions/recipes";
import { formatPeso, pesoInputValue } from "@/lib/money";
import type { Ingredient } from "@/lib/recipes";

const EMPTY: IngredientFormValues = { name: "", unit: "g", packQty: "", packCost: "" };

/** Price of one unit (e.g. one gram), shown to 2 decimal centavos so small numbers are still readable. */
function perUnit(i: Ingredient) {
  const centavos = i.packCost / i.packQty;
  return centavos >= 100 ? formatPeso(Math.round(centavos)) : `₱${(centavos / 100).toFixed(2)}`;
}

export function IngredientsManager({ ingredients }: { ingredients: Ingredient[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<IngredientFormValues>(EMPTY);
  const [error, setError] = useState<{ id: number | null; field: string; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function startEdit(i: Ingredient) {
    setEditing(i.id);
    setDraft({ name: i.name, unit: i.unit, packQty: String(i.packQty), packCost: pesoInputValue(i.packCost) });
    setError(null);
  }

  function save(id: number | null) {
    setError(null);
    startTransition(async () => {
      const result = await saveIngredientAction(id, draft);
      if (!result.ok) {
        setError({ id, field: result.field, message: result.error });
        return;
      }
      toast.success(id === null ? "Ingredient added" : "Ingredient saved");
      setEditing(null);
      setDraft(EMPTY);
      router.refresh();
    });
  }

  function remove(i: Ingredient) {
    if (!window.confirm(`Delete ${i.name}?`)) return;
    startTransition(async () => {
      const result = await deleteIngredientAction(i.id);
      if (!result.ok) toast.error(`${i.name} can't be deleted. ${result.error}`);
      else {
        toast.success("Ingredient deleted");
        router.refresh();
      }
    });
  }

  const fields = (id: number | null, prefix: string) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.6fr_5rem_1fr_1fr]">
      <div className="col-span-2 sm:col-span-1">
        <label htmlFor={`${prefix}-name`} className="field-label">Name</label>
        <input id={`${prefix}-name`} className="field" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Bread flour" />
        {error?.id === id && error.field === "name" ? <p className="field-error" role="alert">{error.message}</p> : null}
      </div>
      <div>
        <label htmlFor={`${prefix}-unit`} className="field-label">Unit</label>
        <input id={`${prefix}-unit`} className="field" value={draft.unit} onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))} placeholder="g" />
        {error?.id === id && error.field === "unit" ? <p className="field-error" role="alert">{error.message}</p> : null}
      </div>
      <div>
        <label htmlFor={`${prefix}-packQty`} className="field-label">Pack size</label>
        <input id={`${prefix}-packQty`} className="field" inputMode="decimal" value={draft.packQty} onChange={(e) => setDraft((d) => ({ ...d, packQty: e.target.value }))} placeholder="1000" />
        {error?.id === id && error.field === "packQty" ? <p className="field-error" role="alert">{error.message}</p> : null}
      </div>
      <div>
        <label htmlFor={`${prefix}-packCost`} className="field-label">Pack price</label>
        <input id={`${prefix}-packCost`} className="field" inputMode="decimal" value={draft.packCost} onChange={(e) => setDraft((d) => ({ ...d, packCost: e.target.value }))} placeholder="48" />
        {error?.id === id && error.field === "packCost" ? <p className="field-error" role="alert">{error.message}</p> : null}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="new-ingredient">
        <h2 id="new-ingredient" className="text-xl">New ingredient</h2>
        <p className="mb-4 text-sm text-muted-foreground">Enter the pack you buy: its size in your unit, and what it costs. Recipes work out the cost of the amount they use.</p>
        {editing === null ? fields(null, "new") : <p className="text-sm text-muted-foreground">Finish editing below first.</p>}
        {editing === null ? (
          <button type="button" disabled={pending} onClick={() => save(null)} className="btn btn-primary mt-4">
            Add ingredient
          </button>
        ) : null}
      </section>

      {ingredients.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-input bg-card px-6 py-10 text-center text-muted-foreground">No ingredients yet. Add the ones your recipes use.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {ingredients.map((i) =>
            editing === i.id ? (
              <li key={i.id} className="space-y-3 p-4">
                {fields(i.id, `edit-${i.id}`)}
                <div className="flex gap-3">
                  <button type="button" disabled={pending} onClick={() => save(i.id)} className="btn btn-primary">Save ingredient</button>
                  <button type="button" onClick={() => { setEditing(null); setDraft(EMPTY); setError(null); }} className="btn btn-outline">Cancel</button>
                </div>
              </li>
            ) : (
              <li key={i.id} className="flex items-center gap-4 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{i.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    {i.packQty} {i.unit} for {formatPeso(i.packCost)} · {perUnit(i)} / {i.unit}
                  </span>
                </span>
                <button type="button" onClick={() => startEdit(i)} className="min-h-11 px-2 text-sm font-medium underline underline-offset-4" aria-label={`Edit ${i.name}`}>Edit</button>
                <button type="button" disabled={pending} onClick={() => remove(i)} className="min-h-11 px-2 text-sm font-medium text-destructive underline underline-offset-4" aria-label={`Delete ${i.name}`}>Delete</button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
