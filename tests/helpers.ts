import { closeDb } from "@/lib/db";

/** Every test file calls this in beforeEach: a brand-new in-memory database. */
export function freshDb() {
  process.env.DB_PATH = ":memory:";
  // The shop is pickup-only; the order rules keep their delivery tests by switching delivery back on here.
  process.env.ALLOW_DELIVERY = "1";
  closeDb();
}
