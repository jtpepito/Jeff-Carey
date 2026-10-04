import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { deliveryGroups, deliveryProvinces } from "@/lib/delivery";
import { pesoInputValue } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  const s = getSettings();
  return (
    <>
      <h1 className="text-3xl">Settings</h1>
      <SettingsForm
        groups={deliveryGroups()}
        area={deliveryProvinces().length > 6 ? "nationwide" : deliveryProvinces().join(", ")}
        initial={{
          freeShippingThreshold: pesoInputValue(s.freeShippingThreshold),
          gcashNumber: s.gcashNumber,
          pickupInfo: s.pickupInfo,
          feeNcr: pesoInputValue(s.feeNcr),
          feeLuzon: pesoInputValue(s.feeLuzon),
          feeVismin: pesoInputValue(s.feeVismin),
        }}
      />
    </>
  );
}
