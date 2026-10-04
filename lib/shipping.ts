import type { RegionGroup } from "./ph-locations";
import type { Settings } from "./settings";

export function shippingFee(subtotal: number, group: RegionGroup, s: Settings): number {
  if (subtotal >= s.freeShippingThreshold) return 0;
  return group === "ncr" ? s.feeNcr : group === "luzon" ? s.feeLuzon : s.feeVismin;
}
