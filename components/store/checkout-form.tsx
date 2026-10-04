"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { submitOrder } from "@/actions/checkout";
import { subtotalOf } from "@/lib/cart";
import { formatPeso } from "@/lib/money";
import type { RegionGroup } from "@/lib/ph-locations";
import type { Settings } from "@/lib/settings";
import { shippingFee } from "@/lib/shipping";
import { cn } from "@/lib/utils";
import { useCart } from "./cart-provider";
import { EmptyState } from "./empty-state";

type Props = { provinces: string[]; groups: Record<string, RegionGroup>; settings: Settings };
type Payment = "cod" | "gcash";

export function CheckoutForm({ provinces, groups, settings }: Props) {
  const router = useRouter();
  const { lines, ready, notices, refresh } = useCart();
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [payment, setPayment] = useState<Payment>("cod");
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [placed, setPlaced] = useState(false);
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);

  // Prices or stock may have changed since the cart was filled.
  useEffect(() => {
    if (ready) void refresh();
  }, [ready, refresh]);

  useEffect(() => {
    if (!province) return;
    let cancelled = false;
    fetch(`/api/locations?province=${encodeURIComponent(province)}`)
      .then((r) => r.json())
      .then((d: { cities: string[] }) => { if (!cancelled) setCities(d.cities); })
      .catch(() => { if (!cancelled) setCities([]); });
    return () => { cancelled = true; };
  }, [province]);

  if (!ready) return <div className="min-h-[60vh]" aria-busy="true" />;
  if (placed) return <p className="py-20 text-center text-muted-foreground" role="status">Order placed. Taking you to your receipt…</p>;
  if (lines.length === 0) {
    return (
      <div className="mt-8">
        {notices.length > 0 ? <p className="mx-auto mb-4 max-w-md text-center text-sm text-destructive">{notices.join(" ")}</p> : null}
        <EmptyState title="Your cart is empty" body="Add something from the shop and come back to check out." action={{ href: "/shop", label: "Browse the shop" }} />
      </div>
    );
  }

  const subtotal = subtotalOf(lines);
  const group = province ? groups[province] : undefined;
  const fee = group ? shippingFee(subtotal, group, settings) : null;
  const total = subtotal + (fee ?? 0);
  const errorFor = (field: string) =>
    error?.field === field ? <p className="field-error" role="alert">{error.message}</p> : null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The ref blocks a second tap that lands before React re-renders the disabled button.
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    const form = new FormData(e.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    startTransition(async () => {
      const result = await submitOrder({
        customerName: text("customerName"), mobile: text("mobile"), province, city, address: text("address"),
        notes: text("notes"), paymentMethod: payment, gcashRef: payment === "gcash" ? text("gcashRef") : undefined,
        lines: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
      });
      if (result.ok) {
        setPlaced(true);
        router.push(`/thank-you/${result.code}`);
        return;
      }
      submitting.current = false;
      setError({ field: result.field, message: result.error });
      if (result.field === "lines") await refresh();
      else document.getElementById(`f-${result.field}`)?.focus();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-start">
      <div className="space-y-9">
        <fieldset className="space-y-4">
          <legend className="font-heading text-2xl">Contact</legend>
          <div>
            <label htmlFor="f-customerName" className="field-label">Full name</label>
            <input id="f-customerName" name="customerName" className="field" autoComplete="name" />
            {errorFor("customerName")}
          </div>
          <div>
            <label htmlFor="f-mobile" className="field-label">Mobile number</label>
            <input id="f-mobile" name="mobile" className="field" inputMode="numeric" autoComplete="tel" placeholder="09XX XXX XXXX" />
            {errorFor("mobile")}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-heading text-2xl">Delivery address</legend>
          <div>
            <label htmlFor="f-province" className="field-label">Province</label>
            <select
              id="f-province"
              className="field"
              value={province}
              onChange={(e) => { setProvince(e.target.value); setCity(""); setCities([]); }}
            >
              <option value="">Choose a province</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errorFor("province")}
          </div>
          <div>
            <label htmlFor="f-city" className="field-label">City / Municipality</label>
            <select id="f-city" className="field" value={city} disabled={!province} onChange={(e) => setCity(e.target.value)}>
              <option value="">{province ? "Choose a city or municipality" : "Choose a province first"}</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errorFor("city")}
          </div>
          <div>
            <label htmlFor="f-address" className="field-label">Street address</label>
            <input id="f-address" name="address" className="field" autoComplete="street-address" placeholder="House no., street, barangay" />
            {errorFor("address")}
          </div>
          <div>
            <label htmlFor="f-notes" className="field-label">Delivery notes <span className="font-normal text-muted-foreground">(optional)</span></label>
            <textarea id="f-notes" name="notes" className="field" rows={2} maxLength={500} placeholder="Landmark, gate code, best time to deliver" />
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-heading text-2xl">Payment</legend>
          <div className="mt-4 space-y-3">
            <PaymentOption id="pay-cod" label="Cash on delivery" hint="Pay the rider in cash when your order arrives." checked={payment === "cod"} onSelect={() => setPayment("cod")} />
            <PaymentOption id="pay-gcash" label="GCash" hint="Send payment now, then enter the reference number." checked={payment === "gcash"} onSelect={() => setPayment("gcash")} />
          </div>
          {errorFor("paymentMethod")}
          {payment === "gcash" ? (
            <div className="mt-4 rounded-2xl bg-muted p-4">
              <p className="text-[15px]">
                Send <strong>{formatPeso(total)}</strong> to <strong>{settings.gcashNumber}</strong>, then enter the reference number below.
              </p>
              {fee === null ? <p className="mt-1 text-sm text-muted-foreground">Choose your province first so the total includes shipping.</p> : null}
              <label htmlFor="f-gcashRef" className="field-label mt-4">GCash reference number</label>
              <input id="f-gcashRef" name="gcashRef" className="field" inputMode="numeric" maxLength={60} placeholder="13-digit number on your GCash receipt" />
              {errorFor("gcashRef")}
            </div>
          ) : null}
        </fieldset>
      </div>

      <div className="md:sticky md:top-24">
        <section data-testid="summary" aria-labelledby="summary-heading" className="rounded-3xl border border-border bg-card p-5">
          <h2 id="summary-heading" className="text-2xl">Order summary</h2>
          {error?.field === "lines" ? <p className="field-error" role="alert">{error.message}</p> : null}
          {notices.length > 0 ? (
            <ul role="status" className="mt-3 space-y-1 rounded-xl bg-honey/10 px-3 py-2 text-sm">
              {notices.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}
          <ul className="mt-4 divide-y divide-border">
            {lines.map((l) => (
              <li key={l.variantId} className="flex justify-between gap-4 py-2.5 text-[15px]">
                <span>
                  {l.productName} <span className="text-muted-foreground">· {l.variantName} × {l.qty}</span>
                </span>
                <span className="font-medium tabular-nums">{formatPeso(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-2 border-t border-border pt-4 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatPeso(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="tabular-nums">{fee === null ? "Choose a province" : fee === 0 ? "Free" : formatPeso(fee)}</dd>
            </div>
            <div className="flex justify-between pt-2 text-lg font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPeso(total)}</dd>
            </div>
          </dl>
        </section>

        {/* Stays at the bottom of the screen on phones so the order can be placed with one thumb. */}
        <div className={cn("sticky bottom-0 z-10 -mx-4 mt-6 border-t border-border bg-background/95 px-4 py-3 backdrop-blur", "md:static md:mx-0 md:border-0 md:bg-transparent md:p-0")}>
          <button type="submit" disabled={pending} className="btn btn-primary w-full">
            {pending ? "Placing order…" : "Place order"}
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {payment === "cod" ? `You'll pay ${formatPeso(total)} in cash on delivery.` : "We'll verify your GCash payment before packing."}
          </p>
        </div>
      </div>
    </form>
  );
}

function PaymentOption({
  id, label, hint, checked, onSelect,
}: { id: string; label: string; hint: string; checked: boolean; onSelect: () => void }) {
  return (
    <div className={cn("relative flex items-start gap-3 rounded-2xl border bg-card p-4", checked ? "border-primary ring-1 ring-primary" : "border-input")}>
      <input id={id} type="radio" name="paymentMethod" checked={checked} onChange={onSelect} aria-describedby={`${id}-hint`} className="relative z-10 mt-1 size-5 cursor-pointer accent-[var(--primary)]" />
      <div>
        {/* The label's ::after stretches over the whole card, so anywhere on it selects the option. */}
        <label htmlFor={id} className="text-base font-semibold after:absolute after:inset-0 after:cursor-pointer">{label}</label>
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
