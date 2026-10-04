"use client";

import { useState } from "react";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";
import { useCart } from "./cart-provider";
import { QtyStepper } from "./qty-stepper";

export function PurchasePanel({ product }: { product: Product }) {
  const firstInStock = product.variants.find((v) => v.stock > 0);
  const [variantId, setVariantId] = useState(firstInStock?.id ?? null);
  const [qty, setQty] = useState(1);
  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const soldOut = !firstInStock;
  const cart = useCart();

  function addToCart() {
    if (!variant) return;
    cart.add({
      variantId: variant.id, qty, productName: product.name, variantName: variant.name, slug: product.slug,
      price: product.price, image: product.images[0] ?? null, stock: variant.stock,
    });
    setQty(1);
    cart.open();
  }

  return (
    <div className="mt-6">
      <p id="variant-label" className="field-label">Choose an option</p>
      <div role="radiogroup" aria-labelledby="variant-label" className="flex flex-wrap gap-2.5">
        {product.variants.map((v) => {
          const out = v.stock === 0;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={v.id === variantId}
              disabled={out}
              onClick={() => { setVariantId(v.id); setQty(1); }}
              className={cn(
                "min-h-12 rounded-full border px-5 text-[15px] font-medium transition-colors",
                v.id === variantId ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:border-foreground/50",
                out && "cursor-not-allowed border-dashed text-muted-foreground line-through decoration-1 opacity-70",
              )}
            >
              {v.name}
              {out ? <span className="ml-1.5 inline-block text-xs no-underline">Sold out</span> : null}
            </button>
          );
        })}
      </div>
      {variant && variant.stock <= 5 ? (
        <p className="mt-3 text-sm font-medium text-honey">Only {variant.stock} left</p>
      ) : null}

      <div className="mt-6 flex items-center gap-3">
        <QtyStepper qty={qty} max={variant?.stock ?? 1} onChange={setQty} />
        <button type="button" onClick={addToCart} disabled={soldOut || !variant} className="btn btn-primary flex-1">
          {soldOut ? "Sold out" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
