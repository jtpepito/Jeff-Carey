// Builds data/ph-locations.json from the `philippines` npm package (provinces, cities, regions).
// Run once with: node scripts/build-ph-locations.mjs
import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const provinces = require("philippines/provinces");
const cities = require("philippines/cities");

const LUZON = new Set(["CAR", "I", "II", "III", "IV-A", "IV-B", "V"]);
const groupOf = (region) => (region === "NCR" ? "ncr" : LUZON.has(region) ? "luzon" : "vismin");

// The package lists cities without the suffix ("Quezon", "Cebu"); add it so they read the way people write addresses.
const label = (c) => (c.city && c.name !== "Manila" && !/ City$/.test(c.name) ? `${c.name} City` : c.name);

const out = {};
for (const p of provinces.slice().sort((a, b) => a.name.localeCompare(b.name))) {
  const names = [...new Set(cities.filter((c) => c.province === p.key).map(label))];
  out[p.name] = { group: groupOf(p.region), cities: names.sort((a, b) => a.localeCompare(b)) };
}
fs.writeFileSync("data/ph-locations.json", JSON.stringify(out));
const empty = Object.entries(out).filter(([, v]) => v.cities.length === 0).map(([k]) => k);
console.log(`${Object.keys(out).length} provinces, Metro Manila has ${out["Metro Manila"].cities.length} cities, empty: ${empty.join(", ") || "none"}`);
