import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClearCart } from "@/components/store/clear-cart";
import { formatPeso } from "@/lib/money";
import { getOrderByCode } from "@/lib/orders";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

const NEXT_STEPS = {
  cod: [
    "We'll text you within a day to confirm your order.",
    "We pack it within 2 business days and hand it to our courier.",
    "Pay the rider in cash when it arrives. Having the exact amount ready helps.",
  ],
  gcash: [
    "We verify your GCash reference within a day and text you once it's confirmed.",
    "We pack your order within 2 business days and hand it to our courier.",
    "Nothing more to pay. The rider just hands over your parcel.",
  ],
};

export default async function ThankYouPage({ params }: { params: Promise<{ code: string }> }) {
  const order = getOrderByCode(decodeURIComponent((await params).code));
  if (!order) notFound();

  return (
    <div className="container-page max-w-2xl pt-10">
      <ClearCart />
      <p className="eyebrow">Order received</p>
      <h1 className="mt-2 text-4xl leading-tight">Salamat!</h1>
      <p className="mt-3 text-[17px] text-muted-foreground">Keep this order code. We&apos;ll use it when we text you.</p>
      <p className="mt-4 inline-block rounded-2xl bg-primary px-5 py-3 font-heading text-3xl tracking-wide text-primary-foreground">{order.code}</p>

      <section className="mt-9" aria-labelledby="next-heading">
        <h2 id="next-heading" className="text-2xl">What happens next</h2>
        <ol className="mt-4 space-y-4">
          {NEXT_STEPS[order.paymentMethod].map((step, i) => (
            <li key={step} className="flex gap-4">
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold">{i + 1}</span>
              <p className="pt-1 text-[15px] leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-9 rounded-3xl border border-border bg-card p-5" aria-labelledby="receipt-heading">
        <h2 id="receipt-heading" className="text-2xl">Your order</h2>
        <ul className="mt-3 divide-y divide-border">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-2.5 text-[15px]">
              <span>
                {i.name} <span className="text-muted-foreground">× {i.qty}</span>
              </span>
              <span className="font-medium tabular-nums">{formatPeso(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-2 border-t border-border pt-4 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">{formatPeso(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className="tabular-nums">{order.shippingFee === 0 ? "Free" : formatPeso(order.shippingFee)}</dd>
          </div>
          <div className="flex justify-between pt-2 text-lg font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPeso(order.total)}</dd>
          </div>
        </dl>
        <div className="mt-4 border-t border-border pt-4 text-[15px]">
          <p className="font-semibold">{order.paymentMethod === "cod" ? "Cash on delivery" : "GCash"}</p>
          {/* Order codes are easy to guess, so nothing personal (name, address, GCash reference) is shown here. */}
          <p className="text-muted-foreground">
            {order.paymentMethod === "cod" ? "Pay when your order arrives." : "We're checking the reference you sent."}
          </p>
        </div>
      </section>

      <Link href="/shop" className="btn btn-outline mt-8 w-full sm:w-auto">
        Keep shopping
      </Link>
    </div>
  );
}
