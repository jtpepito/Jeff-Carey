"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { parsePeso } from "@/lib/money";
import { updateSettings, type Settings } from "@/lib/settings";

export type SettingsFormValues = {
  freeShippingThreshold: string; gcashNumber: string; feeNcr: string; feeLuzon: string; feeVismin: string; pickupInfo: string;
};

const MONEY_FIELDS = ["freeShippingThreshold", "feeNcr", "feeLuzon", "feeVismin"] as const;

export async function saveSettings(
  values: SettingsFormValues,
): Promise<{ ok: true } | { ok: false; field: string; error: string }> {
  await requireAdmin();
  const patch: Partial<Settings> = {};
  for (const field of MONEY_FIELDS) {
    const amount = parsePeso(String(values?.[field] ?? ""));
    if (amount === null) return { ok: false, field, error: "Enter an amount like 80 or 1,500." };
    patch[field] = amount;
  }
  const gcashNumber = String(values?.gcashNumber ?? "").trim();
  if (!gcashNumber) return { ok: false, field: "gcashNumber", error: "Enter the GCash number customers should send to." };
  patch.gcashNumber = gcashNumber.slice(0, 40);
  const pickupInfo = String(values?.pickupInfo ?? "").trim();
  if (!pickupInfo) return { ok: false, field: "pickupInfo", error: "Tell customers where and when they can pick up." };
  patch.pickupInfo = pickupInfo.slice(0, 300);

  updateSettings(patch);
  revalidatePath("/", "layout");
  return { ok: true };
}
