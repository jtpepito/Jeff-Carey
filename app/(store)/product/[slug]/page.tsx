import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/store/product-card";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductTabs } from "@/components/store/product-tabs";
import { PurchasePanel } from "@/components/store/purchase-panel";
import { brand } from "@/lib/brand";
import { formatPeso } from "@/lib/money";
import { getProductBySlug, relatedProducts } from "@/lib/products";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = getProductBySlug((await params).slug);
  return product ? { title: product.name, description: product.description } : {};
}

const paragraphs = (text: string) => text.split(/\n+/).map((s) => s.trim()).filter(Boolean);

export default async function ProductPage({ params }: Props) {
  const product = getProductBySlug((await params).slug);
  if (!product) notFound();
  const related = relatedProducts(product);

  return (
    <div className="container-page pt-5">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/shop" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Shop</Link>
        <span aria-hidden className="mx-2">/</span>
        <Link href={`/shop?category=${encodeURIComponent(product.category)}`} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
          {product.category}
        </Link>
      </nav>

      <div className="mt-2 grid gap-8 md:grid-cols-2 md:gap-12">
        <ProductGallery images={product.images} name={product.name} />
        <div>
          <p className="eyebrow">{product.category}</p>
          <h1 className="mt-2 text-4xl leading-tight">{product.name}</h1>
          <p data-testid="price" className="mt-3 text-2xl font-semibold">
            {formatPeso(product.price)}
            {product.compareAt ? (
              <s className="ml-3 text-lg font-normal text-muted-foreground">{formatPeso(product.compareAt)}</s>
            ) : null}
          </p>
          <PurchasePanel product={product} />
          <p className="mt-4 text-sm text-muted-foreground">{brand.promise}</p>
          <ProductTabs
            tabs={[
              { id: "details", label: "Details", paragraphs: paragraphs(product.description) },
              { id: "how", label: "How to use", paragraphs: paragraphs(product.howToUse) },
              { id: "shipping", label: "Shipping", paragraphs: brand.shippingCopy },
            ].filter((t) => t.paragraphs.length > 0)}
          />
        </div>
      </div>

      {related.length > 0 ? (
        <section data-testid="related" className="pt-16" aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-3xl">You might also like</h2>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
