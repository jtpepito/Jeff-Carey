import { getDb } from "./db";

export type Settings = {
  freeShippingThreshold: number; gcashNumber: string;
  feeNcr: number; feeLuzon: number; feeVismin: number;
  /** Shown to shoppers who choose pickup: where and when to collect. */
  pickupInfo: string;
};

const TEXT_SETTINGS = new Set<keyof Settings>(["gcashNumber", "pickupInfo"]);

const KEYS: Record<keyof Settings, string> = {
  freeShippingThreshold: "free_shipping_threshold", gcashNumber: "gcash_number",
  feeNcr: "shipping_fee_ncr", feeLuzon: "shipping_fee_luzon", feeVismin: "shipping_fee_vismin",
  pickupInfo: "pickup_info",
};

const DEFAULTS: Settings = {
  freeShippingThreshold: 150000, gcashNumber: "0917 000 0000",
  feeNcr: 8000, feeLuzon: 12000, feeVismin: 16000,
  pickupInfo: "We'll text you the pickup address and time once your order is confirmed.",
};

export function getSettings(): Settings {
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const out = { ...DEFAULTS } as Record<string, string | number>;
  for (const [prop, key] of Object.entries(KEYS)) {
    const v = stored.get(key);
    if (v !== undefined) out[prop] = TEXT_SETTINGS.has(prop as keyof Settings) ? v : Number(v);
  }
  return out as Settings;
}

export function updateSettings(patch: Partial<Settings>): void {
  const stmt = getDb().prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );
  for (const [prop, value] of Object.entries(patch)) {
    if (value !== undefined) stmt.run(KEYS[prop as keyof Settings], String(value));
  }
}
