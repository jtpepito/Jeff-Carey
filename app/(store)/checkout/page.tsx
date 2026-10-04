import type { Metadata } from "next";
import { CheckoutForm } from "@/components/store/checkout-form";
import { deliveryProvinces } from "@/lib/delivery";
import { regionGroupOf, type RegionGroup } from "@/lib/ph-locations";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  const names = deliveryProvinces();
  const groups = Object.fromEntries(names.map((p) => [p, regionGroupOf(p)!])) as Record<string, RegionGroup>;
  return (
    <div className="container-page pt-8">
      <h1 className="text-4xl">Checkout</h1>
      <CheckoutForm provinces={names} groups={groups} settings={getSettings()} />
    </div>
  );
}
