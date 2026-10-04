import { brand } from "./brand";
import { provinces, regionGroupOf, type RegionGroup } from "./ph-locations";

/** Provinces the shop delivers to. An empty list in lib/brand.ts means nationwide. */
export function deliveryProvinces(): string[] {
  const all = provinces();
  return brand.deliveryProvinces.length === 0 ? all : all.filter((p) => brand.deliveryProvinces.includes(p));
}

export const deliversTo = (province: string) => deliveryProvinces().includes(province);

/** The fee groups (NCR / Luzon / Vis-Min) that the delivery area touches, so settings only asks for fees that apply. */
export function deliveryGroups(): RegionGroup[] {
  return [...new Set(deliveryProvinces().map((p) => regionGroupOf(p)!))];
}
