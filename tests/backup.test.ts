import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { backupDatabase, closeDb, getDb, KEEP_BACKUPS } from "@/lib/db";

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "jc-backup-"));
  process.env.DB_PATH = path.join(dir, "store.db");
  closeDb();
  getDb();
});
afterEach(() => {
  closeDb();
  fs.rmSync(dir, { recursive: true, force: true });
});

test("only the newest backups with the same label are kept; other labels are untouched", () => {
  const t0 = Date.parse("2026-10-31T01:00:00.000Z");
  for (let i = 0; i < KEEP_BACKUPS + 3; i++) backupDatabase("before-clearing-orders", new Date(t0 + i * 1000));
  backupDatabase("other", new Date(t0));
  const files = fs.readdirSync(dir).filter((f) => f.includes("before-clearing-orders")).sort();
  expect(files).toHaveLength(KEEP_BACKUPS);
  // The three oldest went; the newest is still there.
  expect(files[0]).toContain("01-00-03");
  expect(files.at(-1)).toContain(`01-00-0${KEEP_BACKUPS + 2}`);
  expect(fs.readdirSync(dir).filter((f) => f.includes(".other-"))).toHaveLength(1);
});

test("two backups in the same second do not collide", () => {
  const now = new Date("2026-10-31T01:00:00.123Z");
  const a = backupDatabase("x", now);
  const b = backupDatabase("x", new Date(now.getTime() + 1));
  expect(a).not.toBe(b);
  expect(fs.existsSync(a!) && fs.existsSync(b!)).toBe(true);
});
