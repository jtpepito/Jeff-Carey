import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { pesoInputValue } from "@/lib/money";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  const s = getSettings();
  return (
    <>
      <h1 className="text-3xl">Settings</h1>
      <SettingsForm
        initial={{
          freeShippingThreshold: pesoInputValue(s.freeShippingThreshold),
          gcashNumber: s.gcashNumber,
          feeNcr: pesoInputValue(s.feeNcr),
          feeLuzon: pesoInputValue(s.feeLuzon),
          feeVismin: pesoInputValue(s.feeVismin),
        }}
      />
    </>
  );
}
