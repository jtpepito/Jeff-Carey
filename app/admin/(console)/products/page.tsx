import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AdminEmpty } from "@/components/admin/admin-empty";
import { formatPeso } from "@/lib/money";
import { listProducts } from "@/lib/products";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  const products = listProducts({ includeInactive: true });
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl">Products</h1>
        <Link href="/admin/products/new" className="btn btn-primary">New product</Link>
      </div>
      <div className="mt-5">
        {products.length === 0 ? (
          <AdminEmpty title="No products yet" body="Add your first product and it will appear in the store straight away." action={{ href: "/admin/products/new", label: "Add a product" }} />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {products.map((p) => {
              const stock = p.variants.reduce((sum, v) => sum + v.stock, 0);
              return (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/60">
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {p.images[0] ? (
                        <Image src={p.images[0]} alt="" fill sizes="56px" className="object-cover" unoptimized={!p.images[0].startsWith("https://images.unsplash.com/")} />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {p.category} · {p.variants.length} {p.variants.length === 1 ? "variant" : "variants"} · {stock} in stock
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {p.featured ? <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-[#5f4a0c]">Featured</span> : null}
                        {!p.active ? <span className="rounded-full bg-[#eee6e2] px-2 py-0.5 text-xs font-semibold text-[#6f5a52]">Inactive</span> : null}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatPeso(p.price)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
