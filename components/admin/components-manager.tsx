"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteComponentAction, saveComponentAction, type ComponentFormValues } from "@/actions/recipes";
import { formatPeso } from "@/lib/money";
import type { Component, Ingredient } from "@/lib/recipes";

const EMPTY: ComponentFormValues = { name: "", yieldQty: "", yieldUnit: "g", notes: "", items: [{ ingredientId: 0, qty: "" }] };

/** Centavos per unit shown with two decimals when below one peso. */
export function perUnitLabel(centavos: number, unit: string) {
  return (centavos >= 100 ? formatPeso(Math.round(centavos)) : `₱${(centavos / 100).toFixed(2)}`) + ` / ${unit}`;
}

export function ComponentsManager({ components, ingredients }: { components: Component[]; ingredients: Ingredient[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | null | "new">(null);
  const [draft, setDraft] = useState<ComponentFormValues>(EMPTY);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const byId = new Map(ingredients.map((i) => [i.id, i]));

  function open(c: Component | null) {
    setEditing(c ? c.id : "new");
    setDraft(c ? { name: c.name, yieldQty: String(c.yieldQty), yieldUnit: c.yieldUnit, notes: c.notes, items: c.items.map((l) => ({ ingredientId: l.ingredientId ?? 0, qty: String(l.qty) })) } : EMPTY);
    setError(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveComponentAction(editing === "new" || editing === null ? null : editing, draft);
      if (!result.ok) {
        setError({ field: result.field, message: result.error });
        return;
      }
      toast.success("Component saved");
      setEditing(null);
      router.refresh();
    });
  }

  function remove(c: Component) {
    if (!window.confirm(`Delete ${c.name}?`)) return;
    startTransition(async () => {
      const result = await deleteComponentAction(c.id);
      if (!result.ok) toast.error(`${c.name} can't be deleted. ${result.error}`);
      else {
        toast.success("Component deleted");
        router.refresh();
      }
    });
  }

  const errorFor = (field: string) => (error?.field === field ? <p className="field-error" role="alert">{error.message}</p> : null);
  const setLine = (n: number, patch: Partial<ComponentFormValues["items"][number]>) =>
    setDraft((d) => ({ ...d, items: d.items.map((l, i) => (i === n ? { ...l, ...patch } : l)) }));

  // Live cost of the draft, same maths as the server.
  const draftLines = draft.items.map((l) => {
    const i = byId.get(l.ingredientId);
    const qty = Number(String(l.qty).replace(/,/g, "")) || 0;
    return i ? Math.round((qty / i.packQty) * i.packCost) : 0;
  });
  const draftBatch = draftLines.reduce((a, b) => a + b, 0);
  const draftYield = Number(String(draft.yieldQty).replace(/,/g, "")) || 0;

  const editor = (
    <section className="space-y-4 rounded-2xl border border-primary bg-card p-5" aria-labelledby="component-editor">
      <h2 id="component-editor" className="text-xl">{editing === "new" ? "New component" : "Edit component"}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.6fr_1fr_6rem]">
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="c-name" className="field-label">Component name</label>
          <input id="c-name" className="field" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Sweet dough" />
          {errorFor("name")}
        </div>
        <div>
          <label htmlFor="c-yield" className="field-label">Batch makes</label>
          <input id="c-yield" className="field" inputMode="decimal" value={draft.yieldQty} onChange={(e) => setDraft((d) => ({ ...d, yieldQty: e.target.value }))} placeholder="1200" />
          {errorFor("yieldQty")}
        </div>
        <div>
          <label htmlFor="c-unit" className="field-label">Yield unit</label>
          <input id="c-unit" className="field" value={draft.yieldUnit} onChange={(e) => setDraft((d) => ({ ...d, yieldUnit: e.target.value }))} placeholder="g" />
          {errorFor("yieldUnit")}
        </div>
      </div>
      <div className="space-y-3">
        {draft.items.map((line, n) => (
          <div key={n} className="grid grid-cols-[1fr_auto] gap-3 sm:grid-cols-[1.6fr_8rem_6rem_auto] sm:items-end">
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor={`c-ing-${n}`} className="field-label">Ingredient {n + 1}</label>
              <select id={`c-ing-${n}`} className="field" value={line.ingredientId} onChange={(e) => setLine(n, { ingredientId: Number(e.target.value) })}>
                <option value={0}>Choose an ingredient</option>
                {ingredients.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`c-qty-${n}`} className="field-label">Quantity {n + 1}{byId.get(line.ingredientId) ? ` (${byId.get(line.ingredientId)!.unit})` : ""}</label>
              <input id={`c-qty-${n}`} className="field" inputMode="decimal" value={line.qty} onChange={(e) => setLine(n, { qty: e.target.value })} />
            </div>
            <p className="self-center text-right text-sm font-medium tabular-nums sm:pb-3">{formatPeso(draftLines[n])}</p>
            <button type="button" onClick={() => setDraft((d) => ({ ...d, items: d.items.filter((_, k) => k !== n) }))} className="h-12 px-2 text-sm font-medium text-destructive underline underline-offset-4" aria-label={`Remove ingredient ${n + 1}`}>Remove</button>
          </div>
        ))}
        {errorFor("items")}
        <button type="button" onClick={() => setDraft((d) => ({ ...d, items: [...d.items, { ingredientId: 0, qty: "" }] }))} className="btn btn-outline">Add ingredient line</button>
      </div>
      <div>
        <label htmlFor="c-notes" className="field-label">Notes</label>
        <textarea id="c-notes" className="field" rows={2} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
      </div>
      <p className="text-[15px]">
        Batch costs <strong>{formatPeso(draftBatch)}</strong>
        {draftYield > 0 ? <> → <strong>{perUnitLabel(draftBatch / draftYield, draft.yieldUnit || "unit")}</strong></> : null}
      </p>
      <div className="flex gap-3">
        <button type="button" disabled={pending} onClick={save} className="btn btn-primary">Save component</button>
        <button type="button" onClick={() => setEditing(null)} className="btn btn-outline">Cancel</button>
      </div>
    </section>
  );

  return (
    <div className="space-y-6">
      {editing === "new" ? editor : (
        <button type="button" onClick={() => open(null)} className="btn btn-primary">New component</button>
      )}
      {components.length === 0 && editing !== "new" ? (
        <p className="rounded-2xl border border-dashed border-input bg-card px-6 py-10 text-center text-muted-foreground">
          No components yet. A component is a sub-recipe several products share, like a dough or a topping.
        </p>
      ) : null}
      <ul className="space-y-3">
        {components.map((c) =>
          editing === c.id ? (
            <li key={c.id}>{editor}</li>
          ) : (
            <li key={c.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Makes {c.yieldQty} {c.yieldUnit} for {formatPeso(c.batchCost)} · {perUnitLabel(c.unitCost, c.yieldUnit)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{c.items.map((l) => `${l.name} ${l.qty} ${l.unit}`).join(" · ")}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => open(c)} className="min-h-11 px-2 text-sm font-medium underline underline-offset-4" aria-label={`Edit ${c.name}`}>Edit</button>
                  <button type="button" disabled={pending} onClick={() => remove(c)} className="min-h-11 px-2 text-sm font-medium text-destructive underline underline-offset-4" aria-label={`Delete ${c.name}`}>Delete</button>
                </div>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
