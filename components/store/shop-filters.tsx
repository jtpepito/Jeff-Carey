"use client";

import { useRef } from "react";

/** A plain GET form: the URL holds the filter state, so the grid is server-rendered and shareable. */
export function ShopFilters({
  categories, category, sort, q,
}: { categories: string[]; category: string; sort: string; q: string }) {
  const form = useRef<HTMLFormElement>(null);
  const submit = () => form.current?.requestSubmit();
  return (
    <form ref={form} method="get" action="/shop" className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
      <div>
        <label htmlFor="q" className="sr-only">Search products</label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Search products" className="field" enterKeyHint="search" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:contents">
        <div>
          <label htmlFor="category" className="sr-only">Category</label>
          <select id="category" name="category" defaultValue={category} onChange={submit} className="field">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sort" className="sr-only">Sort by</label>
          <select id="sort" name="sort" defaultValue={sort} onChange={submit} className="field">
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>
      </div>
    </form>
  );
}
