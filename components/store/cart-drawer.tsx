"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { subtotalOf } from "@/lib/cart";
import { formatPeso } from "@/lib/money";
import { useCart } from "./cart-provider";
import { ProductImage } from "./product-image";
import { QtyStepper } from "./qty-stepper";
import { ShippingProgress } from "./shipping-progress";

export function CartDrawer() {
  const { lines, notices, threshold, isOpen, close, setQty } = useCart();
  const subtotal = subtotalOf(lines);

  return (
    <Sheet open={isOpen} onOpenChange={(next) => { if (!next) close(); }}>
      <SheetContent side="right" className="w-full gap-0 bg-background p-0 text-base data-[side=right]:w-full sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="font-heading text-2xl">Your cart</SheetTitle>
          <SheetDescription className="sr-only">Items you have added, and the way to checkout.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {notices.length > 0 ? (
            <ul role="status" className="mb-4 space-y-1 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
              {notices.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}

          {lines.length === 0 ? (
            <div className="py-14 text-center">
              <p className="font-heading text-2xl">Your cart is empty</p>
              <p className="mt-2 text-[15px] text-muted-foreground">Something warm from the oven is a few taps away.</p>
              <Link href="/shop" onClick={close} className="btn btn-primary mt-6">
                Browse the shop
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {lines.map((l) => (
                <li key={l.variantId} className="flex gap-4 py-4">
                  <Link href={`/product/${l.slug}`} onClick={close} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted" aria-label={l.productName}>
                    <ProductImage src={l.image} alt="" sizes="80px" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="leading-snug font-medium">{l.productName}</p>
                    <p className="text-sm text-muted-foreground">{l.variantName}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <QtyStepper size="sm" qty={l.qty} max={l.stock} min={0} onChange={(q) => setQty(l.variantId, q)} />
                      <p className="font-semibold tabular-nums">{formatPeso(l.price * l.qty)}</p>
                    </div>
                    <button type="button" onClick={() => setQty(l.variantId, 0)} className="mt-1 min-h-9 text-sm text-muted-foreground underline underline-offset-4">
                      Remove<span className="sr-only"> {l.productName}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 ? (
          <div className="space-y-3 border-t border-border bg-card px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <ShippingProgress subtotal={subtotal} threshold={threshold} />
            <div className="flex items-baseline justify-between">
              <p className="text-[15px] text-muted-foreground">Subtotal</p>
              <p className="text-xl font-semibold tabular-nums">{formatPeso(subtotal)}</p>
            </div>
            <Link href="/checkout" onClick={close} className="btn btn-primary w-full">
              Checkout
            </Link>
            <p className="text-center text-xs text-muted-foreground">Shipping is calculated at checkout.</p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
