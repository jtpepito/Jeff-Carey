import type { DatabaseSync } from "node:sqlite";
import { brand } from "./brand";
import { manilaYYMM } from "./time";

/** Call inside the order transaction so two orders cannot take the same number. */
export function nextOrderCode(db: DatabaseSync, now: Date): string {
  const prefix = `${brand.prefix}-${manilaYYMM(now)}-`;
  const row = db
    .prepare("SELECT MAX(CAST(substr(code, ?) AS INTEGER)) AS n FROM orders WHERE code LIKE ?")
    .get(prefix.length + 1, prefix + "%") as { n: number | null };
  return prefix + String((row.n ?? 0) + 1).padStart(4, "0");
}
