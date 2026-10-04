"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteProduct, saveProduct } from "@/actions/products";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { slugify, type ProductFormValues } from "@/lib/product-form";

type Props = { productId: number | null; initial: ProductFormValues; categories: string[] };

export function ProductForm({ productId, initial, categories }: Props) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  // The slug follows the name until someone edits the slug by hand (or the product already exists).
  const [slugTouched, setSlugTouched] = useState(productId !== null);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [deactivated, setDeactivated] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => setV((s) => ({ ...s, [key]: value }));
  const setVariant = (i: number, patch: Partial<ProductFormValues["variants"][number]>) =>
    setV((s) => ({ ...s, variants: s.variants.map((row, n) => (n === i ? { ...row, ...patch } : row)) }));
  const errorFor = (field: string) =>
    error?.field === field ? <p className="field-error" role="alert">{error.message}</p> : null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveProduct(productId, v);
      if (!result.ok) {
        setError({ field: result.field, message: result.error });
        return;
      }
      toast.success("Product saved");
      router.push("/admin/products");
      router.refresh();
    });
  }

  function onDelete() {
    if (productId === null) return;
    startTransition(async () => {
      const outcome = await deleteProduct(productId);
      setConfirming(false);
      if (outcome === "deactivated") {
        // No refresh here: the page would remount this form and lose the notice below.
        setDeactivated(true);
        set("active", false);
        return;
      }
      toast.success("Product deleted");
      router.push("/admin/products");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-start">
      <div className="space-y-6">
        {deactivated ? (
          <p role="status" className="rounded-2xl border border-honey/40 bg-honey/10 px-4 py-3 text-[15px]">
            This product has past orders, so it was deactivated instead of deleted. It no longer shows in the store, and order history is unchanged.
          </p>
        ) : null}

        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label htmlFor="p-name" className="field-label">Name</label>
            <input
              id="p-name" className="field" value={v.name}
              onChange={(e) => setV((s) => ({ ...s, name: e.target.value, slug: slugTouched ? s.slug : slugify(e.target.value) }))}
            />
            {errorFor("name")}
          </div>
          <div>
            <label htmlFor="p-slug" className="field-label">Slug</label>
            <input id="p-slug" className="field" value={v.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} autoCapitalize="none" spellCheck={false} />
            <p className="mt-1 text-sm text-muted-foreground">The product&apos;s web address: /product/{v.slug || "…"}</p>
            {errorFor("slug")}
          </div>
          <div>
            <label htmlFor="p-category" className="field-label">Category</label>
            <input id="p-category" className="field" list="category-options" value={v.category} onChange={(e) => set("category", e.target.value)} />
            <datalist id="category-options">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {errorFor("category")}
          </div>
          <div>
            <label htmlFor="p-description" className="field-label">Description</label>
            <textarea id="p-description" className="field" rows={4} value={v.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div>
            <label htmlFor="p-how" className="field-label">How to use</label>
            <textarea id="p-how" className="field" rows={3} value={v.howToUse} onChange={(e) => set("howToUse", e.target.value)} />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="variants-heading">
          <h2 id="variants-heading" className="text-xl">Variants</h2>
          <p className="text-sm text-muted-foreground">Sizes or flavours. Each has its own stock; all share the product price.</p>
          <div className="mt-4 space-y-4">
            {v.variants.map((row, i) => (
              <div key={row.id ?? `new-${i}`} className="grid grid-cols-2 gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1.4fr_1fr_6rem_auto] sm:items-end sm:border-0 sm:p-0">
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor={`v-name-${i}`} className="field-label">Variant {i + 1} name</label>
                  <input id={`v-name-${i}`} className="field" value={row.name} onChange={(e) => setVariant(i, { name: e.target.value })} placeholder="250g" />
                </div>
                <div>
                  <label htmlFor={`v-sku-${i}`} className="field-label">Variant {i + 1} SKU</label>
                  <input id={`v-sku-${i}`} className="field" value={row.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} />
                </div>
                <div>
                  <label htmlFor={`v-stock-${i}`} className="field-label">Variant {i + 1} stock</label>
                  <input id={`v-stock-${i}`} className="field" inputMode="numeric" value={row.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} />
                </div>
                <button
                  type="button"
                  disabled={v.variants.length === 1}
                  onClick={() => setV((s) => ({ ...s, variants: s.variants.filter((_, n) => n !== i) }))}
                  className="col-span-2 h-12 rounded-full px-3 text-sm font-medium text-destructive underline underline-offset-4 disabled:text-muted-foreground disabled:no-underline disabled:opacity-60 sm:col-span-1"
                  aria-label={`Remove variant ${i + 1}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          {errorFor("variants")}
          <button type="button" onClick={() => setV((s) => ({ ...s, variants: [...s.variants, { name: "", sku: "", stock: "0" }] }))} className="btn btn-outline mt-4">
            Add variant
          </button>
        </section>
      </div>

      <div className="space-y-6">
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label htmlFor="p-price" className="field-label">Price</label>
            <input id="p-price" className="field" inputMode="decimal" value={v.price} onChange={(e) => set("price", e.target.value)} placeholder="480" />
            {errorFor("price")}
          </div>
          <div>
            <label htmlFor="p-compare" className="field-label">Compare-at price</label>
            <input id="p-compare" className="field" inputMode="decimal" value={v.compareAt} onChange={(e) => set("compareAt", e.target.value)} placeholder="Optional" />
            <p className="mt-1 text-sm text-muted-foreground">Shown crossed out when it&apos;s higher than the price.</p>
            {errorFor("compareAt")}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <label htmlFor="p-images" className="field-label">Image URLs (one per line)</label>
          <textarea id="p-images" className="field font-mono text-sm" rows={4} value={v.images} onChange={(e) => set("images", e.target.value)} spellCheck={false} placeholder="https://images.unsplash.com/…" />
          <p className="mt-1 text-sm text-muted-foreground">The first image is the main one.</p>
          {errorFor("images")}
        </section>

        <section className="space-y-1 rounded-2xl border border-border bg-card p-5">
          <label className="flex min-h-12 items-center gap-3 text-[15px] font-medium">
            <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={v.featured} onChange={(e) => set("featured", e.target.checked)} />
            Featured
          </label>
          <label className="flex min-h-12 items-center gap-3 text-[15px] font-medium">
            <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={v.active} onChange={(e) => set("active", e.target.checked)} />
            Active
          </label>
          <p className="text-sm text-muted-foreground">Featured products appear in Best sellers. Inactive products are hidden from the store.</p>
        </section>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={pending} className="btn btn-primary flex-1">
            {pending ? "Saving…" : "Save product"}
          </button>
          <Link href="/admin/products" className="btn btn-outline">Cancel</Link>
        </div>
        {productId !== null ? (
          <button type="button" disabled={pending} onClick={() => setConfirming(true)} className="min-h-11 text-sm font-medium text-destructive underline underline-offset-4">
            Delete product
          </button>
        ) : null}
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Delete this product?</DialogTitle>
            <DialogDescription>
              If it has past orders it will be deactivated instead, so order history stays intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setConfirming(false)} className="btn btn-outline">Keep it</button>
            <button type="button" disabled={pending} onClick={onDelete} className="btn btn-danger">Yes, delete</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
