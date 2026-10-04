// Runs before Playwright starts its servers: a seeded database (port 3218) and an untouched one (port 3219).
import fs from "node:fs";
import { closeDb } from "../lib/db";
import { seed } from "../lib/seed-data";

for (const f of ["data/e2e.db", "data/e2e-empty.db"])
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(f + suffix, { force: true });

process.env.DB_PATH = "data/e2e.db";
seed();
closeDb();
console.log("e2e databases reset");
