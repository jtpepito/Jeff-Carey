import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CostingCard } from "@/components/admin/costing-card";
import { ProductForm } from "@/components/admin/product-form";
import { pesoInputValue } from "@/lib/money";
import { getProductById, listProducts } from "@/lib/products";
import { getRecipe } from "@/lib/recipes";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const product = getProductById(Number((await params).id));
  if (!product) notFound();
  const categories = [...new Set(listProducts({ includeInactive: true }).map((p) => p.category))].sort();

  return (
    <>
      <h1 className="text-3xl">{product.name}</h1>
      <div className="mt-5">
        <CostingCard productId={product.id} recipe={getRecipe(product.id)} targetMarkup={getSettings().targetMarkup} />
      </div>
      <ProductForm
        // Remount with fresh values when stock or details change elsewhere. "active" is left out so the
        // form survives its own deactivate-on-delete and can keep showing the notice.
        key={JSON.stringify({ ...product, active: null })}
        productId={product.id}
        categories={categories}
        initial={{
          name: product.name, slug: product.slug, category: product.category,
          description: product.description, howToUse: product.howToUse,
          price: pesoInputValue(product.price),
          compareAt: product.compareAt ? pesoInputValue(product.compareAt) : "",
          images: product.images.join("\n"), featured: product.featured, active: product.active,
          variants: product.variants.map((v) => ({ id: v.id, name: v.name, sku: v.sku, stock: String(v.stock), stockWas: v.stock, price: v.price == null ? "" : pesoInputValue(v.price) })),
        }}
      />
    </>
  );
}
