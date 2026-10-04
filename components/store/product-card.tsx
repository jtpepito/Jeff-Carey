import Link from "next/link";
import { formatPeso } from "@/lib/money";
import type { Product } from "@/lib/products";
import { ProductImage } from "./product-image";

export function ProductCard({ product, sizes = "(min-width: 768px) 25vw, 50vw" }: { product: Product; sizes?: string }) {
  const soldOut = product.variants.every((v) => v.stock === 0);
  return (
    <Link href={`/product/${product.slug}`} data-testid="product-card" className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          sizes={sizes}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {soldOut ? (
          <span className="absolute top-3 left-3 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">Sold out</span>
        ) : product.compareAt ? (
          <span className="absolute top-3 left-3 rounded-full bg-honey px-3 py-1 text-xs font-semibold text-white">Sale</span>
        ) : null}
      </div>
      <div className="mt-3">
        <p className="text-xs text-muted-foreground">{product.category}</p>
        <h3 className="mt-0.5 text-[17px] leading-snug font-medium">{product.name}</h3>
        <p className="mt-1 text-[15px] font-semibold">
          {formatPeso(product.price)}
          {product.compareAt ? (
            <s className="ml-2 font-normal text-muted-foreground">{formatPeso(product.compareAt)}</s>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
