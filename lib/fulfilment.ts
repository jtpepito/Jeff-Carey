import { brand } from "./brand";

/**
 * Whether the shop takes pickup orders only. Set in lib/brand.ts; tests of the delivery rules set
 * ALLOW_DELIVERY=1 to exercise the delivery path without changing the brand.
 */
export function pickupOnly(): boolean {
  if (process.env.ALLOW_DELIVERY === "1") return false;
  return brand.pickupOnly;
}
