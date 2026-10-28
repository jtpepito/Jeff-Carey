import type { Metadata } from "next";
import { CheckoutForm } from "@/components/store/checkout-form";
import { deliveryProvinces } from "@/lib/delivery";
import { regionGroupOf, type RegionGroup } from "@/lib/ph-locations";
import { MAX_LEAD_DAYS, MIN_LEAD_DAYS } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { manilaDate } from "@/lib/time";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  const names = deliveryProvinces();
  const groups = Object.fromEntries(names.map((p) => [p, regionGroupOf(p)!])) as Record<string, RegionGroup>;
  return (
    <div className="container-page pt-8">
      <h1 className="text-4xl">Checkout</h1>
      <CheckoutForm
        provinces={names}
        groups={groups}
        settings={getSettings()}
        dates={{ min: manilaDate(new Date(), MIN_LEAD_DAYS), max: manilaDate(new Date(), MAX_LEAD_DAYS), leadDays: MIN_LEAD_DAYS }}
      />
    </div>
  );
}
