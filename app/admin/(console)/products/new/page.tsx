import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";
import { listProducts } from "@/lib/products";

export const metadata: Metadata = { title: "New product" };

export default function NewProductPage() {
  const categories = [...new Set(listProducts({ includeInactive: true }).map((p) => p.category))].sort();
  return (
    <>
      <h1 className="text-3xl">New product</h1>
      <ProductForm
        productId={null}
        categories={categories}
        initial={{
          name: "", slug: "", category: "", description: "", howToUse: "", price: "", compareAt: "", images: "",
          featured: false, active: true, variants: [{ name: "", sku: "", stock: "0" }],
        }}
      />
    </>
  );
}
