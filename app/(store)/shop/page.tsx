import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/store/empty-state";
import { ProductCard } from "@/components/store/product-card";
import { ShopFilters } from "@/components/store/shop-filters";
import { listCategories, listProducts, type ProductSort } from "@/lib/products";

export const metadata: Metadata = { title: "Shop" };

const SORTS: ProductSort[] = ["featured", "price-asc", "price-desc"];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ShopPage({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const category = one(params.category);
  const q = one(params.q).trim();
  const sort = SORTS.includes(one(params.sort) as ProductSort) ? (one(params.sort) as ProductSort) : "featured";

  const products = listProducts({ category: category || undefined, q: q || undefined, sort });
  const filtered = Boolean(category || q);

  return (
    <div className="container-page pt-8">
      <h1 className="text-4xl">{category || "Shop"}</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">
        {products.length} {products.length === 1 ? "product" : "products"}
        {q ? ` for “${q}”` : ""}
      </p>
      <div className="mt-5">
        {/* key resets the uncontrolled inputs when the URL changes */}
        <ShopFilters key={`${category}|${sort}|${q}`} categories={listCategories()} category={category} sort={sort} q={q} />
      </div>

      {products.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No products found"
            body={filtered ? "Nothing matches that search. Try a different word or category." : "The shelves are empty right now. Check back soon."}
            action={filtered ? { href: "/shop", label: "Clear filters" } : undefined}
          />
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
      {filtered && products.length > 0 ? (
        <p className="mt-8">
          <Link href="/shop" className="inline-flex min-h-11 items-center text-[15px] font-semibold underline underline-offset-4">
            Clear filters
          </Link>
        </p>
      ) : null}
    </div>
  );
}
