import data from "../data/ph-locations.json";

export type RegionGroup = "ncr" | "luzon" | "vismin";
const map = data as Record<string, { group: RegionGroup; cities: string[] }>;

export const provinces = () => Object.keys(map).sort((a, b) => a.localeCompare(b));
export const citiesOf = (province: string) => [...(map[province]?.cities ?? [])].sort((a, b) => a.localeCompare(b));
export const regionGroupOf = (province: string): RegionGroup | null => map[province]?.group ?? null;
export const isValidLocation = (province: string, city: string) => map[province]?.cities.includes(city) ?? false;
