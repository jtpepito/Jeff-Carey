import { closeDb } from "@/lib/db";

/** Every test file calls this in beforeEach: a brand-new in-memory database. */
export function freshDb() {
  process.env.DB_PATH = ":memory:";
  closeDb();
}
