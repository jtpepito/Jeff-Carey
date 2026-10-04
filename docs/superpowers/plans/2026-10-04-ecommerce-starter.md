# E-commerce Starter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first storefront and order console for a PH D2C brand (demo brand: Bukid Lane), taking COD and GCash-reference orders.

**Architecture:** Next.js server components read SQLite directly through small `lib/` modules that hold every business rule and have no React dependency. All mutations are server actions that wrap those modules. Client components exist only for the cart drawer, variant picker, checkout form and admin forms.

**Tech Stack:** Next.js 15 (App Router, webpack), TypeScript, Tailwind, shadcn/ui, `node:sqlite` on Node 24, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-04-ecommerce-starter-design.md` — read it before starting any task.

## Global Constraints

- Project root: `C:\WWJ\Claude Coding\Jef&Carey`. The `&` in the folder name breaks npm's `.cmd` shims on Windows (verified: `npm run` of any `node_modules/.bin` tool fails with `'Carey\node_modules\.bin\' is not recognized`). Therefore **every npm script calls `node <path-to-js-entry>` directly**, never a bare bin name. Never run `npx <local-bin>` inside the project; use the same `node <path>` form.
- Next.js `15.x` exactly (not 16). Read `node_modules/next/dist/docs/` if present before using an API you are unsure of. In Next 15, `params`, `searchParams` and `cookies()` are async — always `await` them.
- `node:sqlite` only. No ORM, no other database, no Docker, no cloud service, no payment SDK.
- Money is integer centavos everywhere in code and the database. Only `lib/money.ts` converts to or from ₱ text.
- Timestamps are UTC ISO strings. "Today" and order-code months use Asia/Manila (UTC+8, no DST).
- Order code format `BL-YYMM-NNNN`. Free-shipping threshold default ₱1,500; free when `subtotal >= threshold`.
- All brand text comes from `lib/brand.ts`. No brand strings hard-coded in components.
- Ports: dev `3010`, e2e `3218` (seeded) and `3219` (empty database). Ports 3000 and 3005 are used by other apps on this PC.
- shadcn/ui may install its Base UI flavour, which has no `asChild` prop. Style links with `buttonVariants()` instead of wrapping `<Link>` in `<Button asChild>`.
- Commit after every task with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Non-goals: card payments, customer accounts, vouchers, inventory sync, courier APIs, emails.

## Review Focus

Inputs the spec implies but does not spell out. Each has a test in the task named.

1. **Tampered or sloppy cart lines** — duplicate variant ids, qty of 0, negative, fractional or huge, whitespace-only GCash reference. Expected: duplicates merge, bad quantities and blank references are rejected with a clear message, no stock changes. (Task 5)
2. **Last unit bought twice** — two orders for the final unit of a variant. Expected: the first succeeds, the second is rejected and stock stays at 0, never negative. (Task 5)
3. **Stale or corrupt `localStorage` cart** — invalid JSON, or variant ids that were deleted or deactivated. Expected: the cart loads as empty or drops the dead lines with a notice; no crash. (Task 9)
4. **Double tap on "Place order"** — expected: exactly one order. (Task 10)
5. **Admin price and stock entry** — "1,299.50", empty, negative, or text in a price or stock field; compare-at lower than price. Expected: commas accepted, invalid values rejected with a field error, compare-at not above price is stored as null. (Task 2 for parsing, Task 13 for the form)

## File Structure

```
app/(store)/layout.tsx                 header, cart drawer, footer; force-dynamic
app/(store)/page.tsx                   /
app/(store)/shop/page.tsx              /shop
app/(store)/product/[slug]/page.tsx
app/(store)/checkout/page.tsx
app/(store)/thank-you/[code]/page.tsx
app/admin/login/page.tsx
app/admin/(console)/layout.tsx         admin nav
app/admin/(console)/page.tsx           dashboard
app/admin/(console)/orders/page.tsx, orders/[id]/page.tsx
app/admin/(console)/products/page.tsx, products/new/page.tsx, products/[id]/page.tsx
app/admin/(console)/settings/page.tsx
actions/cart.ts, checkout.ts, auth.ts, orders.ts, products.ts, settings.ts
components/store/*                     storefront components
components/admin/*                     admin components
components/ui/*                        shadcn
lib/db.ts, brand.ts, money.ts, time.ts, settings.ts, ph-locations.ts, shipping.ts,
    products.ts, order-code.ts, orders.ts, auth.ts, cart.ts
data/ph-locations.json                 generated once, committed
scripts/build-ph-locations.mjs, scripts/seed.ts
tests/*.test.ts                        Vitest
e2e/*.spec.ts                          Playwright
middleware.ts
```

---

### Task 1: Scaffold, tooling, database singleton

**Files:**
- Create: project scaffold, `package.json` scripts, `vitest.config.ts`, `playwright.config.ts`, `lib/db.ts`, `tests/helpers.ts`, `tests/db.test.ts`, `.env.example`, `.gitignore` additions

**Interfaces:**
- Produces: `getDb(): DatabaseSync`, `tx<T>(fn: (db: DatabaseSync) => T): T`, `closeDb(): void` from `lib/db.ts`; `freshDb(): void` from `tests/helpers.ts`.

- [ ] **Step 1: Scaffold in a temp folder and move in.** `create-next-app` rejects `Jef&Carey` as a package name, so scaffold beside it. Run from `C:\WWJ\Claude Coding`:

```powershell
npx create-next-app@15 storefront-tmp --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --no-turbopack
Remove-Item -Recurse -Force "storefront-tmp\.git"
Get-ChildItem -Force "storefront-tmp" | Move-Item -Destination "Jef&Carey"
Remove-Item "storefront-tmp"
```

Then in `Jef&Carey\package.json` set `"name": "bukid-lane-storefront"`. Confirm `next` resolved to `15.x` (`node -p "require('./node_modules/next/package.json').version"`).

- [ ] **Step 2: Install dev tools.**

```powershell
npm i -D vitest @playwright/test tsx
node node_modules/@playwright/test/cli.js install chromium
```

- [ ] **Step 3: Replace the `scripts` block in `package.json`.**

```json
"scripts": {
  "dev": "node node_modules/next/dist/bin/next dev -p 3010",
  "build": "node node_modules/next/dist/bin/next build",
  "start": "node node_modules/next/dist/bin/next start -p 3010",
  "lint": "node node_modules/eslint/bin/eslint.js .",
  "typecheck": "node node_modules/typescript/bin/tsc --noEmit",
  "test": "node node_modules/vitest/vitest.mjs run",
  "seed": "node node_modules/tsx/dist/cli.mjs scripts/seed.ts",
  "e2e": "node node_modules/next/dist/bin/next build && node node_modules/@playwright/test/cli.js test"
}
```

- [ ] **Step 4: Add shadcn/ui.** Run `npx shadcn@latest init -d`, then `npx shadcn@latest add button input label select radio-group sheet tabs accordion table badge textarea checkbox sonner`. (`npx` of a remote package works; only local bins are broken.) If it fails because of the folder name, run the same two commands in a copy of the project at a path without `&` and copy back `components/ui`, `components.json`, `lib/utils.ts` and the CSS changes.

- [ ] **Step 5: Write `vitest.config.ts`.**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], environment: "node", pool: "forks" },
  resolve: { alias: { "@": path.resolve(__dirname) } },
});
```

- [ ] **Step 6: Write the failing test `tests/db.test.ts` and `tests/helpers.ts`.**

```ts
// tests/helpers.ts
import { closeDb } from "@/lib/db";

/** Every test file calls this in beforeEach: a brand-new in-memory database. */
export function freshDb() {
  process.env.DB_PATH = ":memory:";
  closeDb();
}
```

```ts
// tests/db.test.ts
import { beforeEach, expect, test } from "vitest";
import { getDb, tx } from "@/lib/db";
import { freshDb } from "./helpers";

beforeEach(freshDb);

test("schema exists on first open and the database is empty", () => {
  const tables = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all()
    .map((r) => r.name);
  expect(tables).toEqual(expect.arrayContaining(["order_items", "orders", "products", "settings", "variants"]));
  expect(getDb().prepare("SELECT COUNT(*) c FROM products").get()!.c).toBe(0);
});

test("getDb returns the same connection", () => {
  expect(getDb()).toBe(getDb());
});

test("tx rolls back on throw", () => {
  expect(() =>
    tx((db) => {
      db.prepare("INSERT INTO settings (key, value) VALUES ('a', '1')").run();
      throw new Error("boom");
    }),
  ).toThrow("boom");
  expect(getDb().prepare("SELECT COUNT(*) c FROM settings").get()!.c).toBe(0);
});
```

- [ ] **Step 7: Run `npm test`.** Expected: FAIL, cannot resolve `@/lib/db`.

- [ ] **Step 8: Write `lib/db.ts`.**

```ts
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  how_to_use TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price >= 0),
  compare_at INTEGER,
  images TEXT NOT NULL DEFAULT '[]',
  featured INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sku TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  admin_notes TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cod','gcash')),
  gcash_ref TEXT,
  shipping_fee INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','confirmed','shipped','delivered','cancelled')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  variant_id INTEGER NOT NULL,
  name_snapshot TEXT NOT NULL,
  price_snapshot INTEGER NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0)
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
`;

// Kept on globalThis so Next's dev-mode module reloads reuse one connection.
const g = globalThis as unknown as { __db?: DatabaseSync; __dbPath?: string };

function dbPath() {
  return process.env.DB_PATH ?? path.join(process.cwd(), "data", "store.db");
}

export function getDb(): DatabaseSync {
  const file = dbPath();
  if (g.__db && g.__dbPath === file) return g.__db;
  closeDb();
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  g.__db = db;
  g.__dbPath = file;
  return db;
}

export function closeDb() {
  g.__db?.close();
  g.__db = undefined;
  g.__dbPath = undefined;
}

/** Runs fn inside BEGIN IMMEDIATE; commits on return, rolls back on throw. */
export function tx<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn(db);
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
```

- [ ] **Step 9: Run `npm test`.** Expected: 3 passed. If Vitest cannot resolve `node:sqlite`, add `server: { deps: { external: [/^node:/] } }` under `test` in `vitest.config.ts`.

- [ ] **Step 10: Config files.** Add `/data/*.db*`, `/test-results`, `/playwright-report` to `.gitignore` (keep `data/ph-locations.json` tracked). Create `.env.example` containing `ADMIN_PASSWORD=` and `# DB_PATH=data/store.db`. In `next.config.ts` add `images: { remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }] }`. Run `npm run build` once to confirm `node:sqlite` is not bundled; if webpack errors on it, add `webpack: (c) => { c.externals.push({ "node:sqlite": "commonjs node:sqlite" }); return c; }`.

- [ ] **Step 11: Commit.** `git add -A; git commit -m "chore: scaffold Next 15 app with sqlite singleton and test tooling"`

---

### Task 2: Money, time, settings, brand

**Files:**
- Create: `lib/money.ts`, `lib/time.ts`, `lib/settings.ts`, `lib/brand.ts`, `tests/money.test.ts`, `tests/time.test.ts`, `tests/settings.test.ts`

**Interfaces:**
- Consumes: `getDb` from Task 1.
- Produces:
  - `formatPeso(centavos: number): string`, `parsePeso(text: string): number | null`
  - `manilaYYMM(d: Date): string`, `manilaDayRange(d: Date): { start: string; end: string }` (UTC ISO, end exclusive), `formatManila(iso: string): string`
  - `type Settings = { freeShippingThreshold: number; gcashNumber: string; feeNcr: number; feeLuzon: number; feeVismin: number }`, `getSettings(): Settings`, `updateSettings(patch: Partial<Settings>): void`
  - `brand` object: `{ name, prefix, tagline, promise, story, shippingCopy, faqs: {q, a}[], gallery: string[] }`

- [ ] **Step 1: Write failing tests.**

```ts
// tests/money.test.ts
import { expect, test } from "vitest";
import { formatPeso, parsePeso } from "@/lib/money";

test("formatPeso drops .00 and groups thousands", () => {
  expect(formatPeso(150000)).toBe("₱1,500");
  expect(formatPeso(149950)).toBe("₱1,499.50");
  expect(formatPeso(0)).toBe("₱0");
});

test("parsePeso accepts commas, peso sign and decimals", () => {
  expect(parsePeso("1,299.50")).toBe(129950);
  expect(parsePeso("₱ 450")).toBe(45000);
  expect(parsePeso("0")).toBe(0);
});

test("parsePeso rejects empty, negative, text and more than 2 decimals", () => {
  for (const bad of ["", "  ", "-5", "abc", "12.345", "1e3"]) expect(parsePeso(bad)).toBeNull();
});
```

```ts
// tests/time.test.ts
import { expect, test } from "vitest";
import { manilaDayRange, manilaYYMM } from "@/lib/time";

test("month rolls over at Manila midnight, not UTC midnight", () => {
  // 2026-09-30 16:30 UTC is 2026-10-01 00:30 in Manila
  expect(manilaYYMM(new Date("2026-09-30T16:30:00Z"))).toBe("2610");
  expect(manilaYYMM(new Date("2026-09-30T15:30:00Z"))).toBe("2609");
});

test("day range is the Manila calendar day in UTC", () => {
  expect(manilaDayRange(new Date("2026-10-04T03:00:00Z"))).toEqual({
    start: "2026-10-03T16:00:00.000Z",
    end: "2026-10-04T16:00:00.000Z",
  });
});
```

```ts
// tests/settings.test.ts
import { beforeEach, expect, test } from "vitest";
import { getSettings, updateSettings } from "@/lib/settings";
import { freshDb } from "./helpers";

beforeEach(freshDb);

test("defaults apply on an empty database", () => {
  expect(getSettings()).toEqual({
    freeShippingThreshold: 150000, gcashNumber: "0917 000 0000",
    feeNcr: 8000, feeLuzon: 12000, feeVismin: 16000,
  });
});

test("updateSettings persists only the given keys", () => {
  updateSettings({ feeNcr: 9900, gcashNumber: "0998 111 2222" });
  expect(getSettings()).toMatchObject({ feeNcr: 9900, gcashNumber: "0998 111 2222", feeLuzon: 12000 });
});
```

- [ ] **Step 2: Run `npm test`.** Expected: FAIL, modules not found.

- [ ] **Step 3: Implement.**

```ts
// lib/money.ts
const fmt2 = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 });

export function formatPeso(centavos: number): string {
  return "₱" + (centavos % 100 === 0 ? fmt0.format(centavos / 100) : fmt2.format(centavos / 100));
}

/** "1,299.50" -> 129950. Returns null for anything that is not a non-negative peso amount. */
export function parsePeso(text: string): number | null {
  const cleaned = text.replace(/[₱,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}
```

```ts
// lib/time.ts
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function manilaYYMM(d: Date): string {
  const m = new Date(d.getTime() + MANILA_OFFSET_MS);
  return String(m.getUTCFullYear() % 100).padStart(2, "0") + String(m.getUTCMonth() + 1).padStart(2, "0");
}

export function manilaDayRange(d: Date): { start: string; end: string } {
  const startMs = Math.floor((d.getTime() + MANILA_OFFSET_MS) / DAY_MS) * DAY_MS - MANILA_OFFSET_MS;
  return { start: new Date(startMs).toISOString(), end: new Date(startMs + DAY_MS).toISOString() };
}

export function formatManila(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short",
  }).format(new Date(iso));
}
```

```ts
// lib/settings.ts
import { getDb } from "./db";

export type Settings = {
  freeShippingThreshold: number; gcashNumber: string;
  feeNcr: number; feeLuzon: number; feeVismin: number;
};

const KEYS: Record<keyof Settings, string> = {
  freeShippingThreshold: "free_shipping_threshold", gcashNumber: "gcash_number",
  feeNcr: "shipping_fee_ncr", feeLuzon: "shipping_fee_luzon", feeVismin: "shipping_fee_vismin",
};

const DEFAULTS: Settings = {
  freeShippingThreshold: 150000, gcashNumber: "0917 000 0000",
  feeNcr: 8000, feeLuzon: 12000, feeVismin: 16000,
};

export function getSettings(): Settings {
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const out = { ...DEFAULTS } as Record<string, string | number>;
  for (const [prop, key] of Object.entries(KEYS)) {
    const v = stored.get(key);
    if (v !== undefined) out[prop] = prop === "gcashNumber" ? v : Number(v);
  }
  return out as Settings;
}

export function updateSettings(patch: Partial<Settings>): void {
  const stmt = getDb().prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );
  for (const [prop, value] of Object.entries(patch)) {
    if (value !== undefined) stmt.run(KEYS[prop as keyof Settings], String(value));
  }
}
```

`lib/brand.ts`: export `brand` with `name: "Bukid Lane"`, `prefix: "BL"`, a one-line `tagline`, a `promise` (roasted or packed to order, shipped within 2 business days), a three-sentence `story` about buying direct from smallholder farms in Benguet, Davao and Bukidnon, `shippingCopy` (courier, 2–5 days NCR/Luzon, 4–8 days Vis-Min, COD nationwide), five `faqs` (delivery time, COD, how GCash payment works, freshness/shelf life, returns), and `gallery` of six Unsplash URLs. Write real copy; use the stop-slop skill on it.

- [ ] **Step 4: Run `npm test`.** Expected: all pass.
- [ ] **Step 5: Commit.** `git commit -am "feat: money, Manila time, settings and brand modules"` (after `git add -A`).

---

### Task 3: PH locations and shipping fee

**Files:**
- Create: `scripts/build-ph-locations.mjs`, `data/ph-locations.json`, `lib/ph-locations.ts`, `lib/shipping.ts`, `tests/shipping.test.ts`

**Interfaces:**
- Consumes: `Settings` from Task 2.
- Produces:
  - `type RegionGroup = "ncr" | "luzon" | "vismin"`
  - `provinces(): string[]` (sorted), `citiesOf(province: string): string[]` (sorted, `[]` if unknown), `regionGroupOf(province: string): RegionGroup | null`, `isValidLocation(province: string, city: string): boolean`
  - `shippingFee(subtotal: number, group: RegionGroup, s: Settings): number`

- [ ] **Step 1: Generate the data file.** `npm i -D philippines`. Write `scripts/build-ph-locations.mjs` that reads the package's `provinces.json` and `cities.json`, and writes `data/ph-locations.json` shaped as `{ "<Province name>": { "group": "ncr|luzon|vismin", "cities": ["..."] } }`. Group rule by region: NCR → `ncr`; CAR, Regions I, II, III, IV-A, IV-B/MIMAROPA, V → `luzon`; everything else → `vismin`. Run it with `node scripts/build-ph-locations.mjs`. Then check the output: at least 81 provinces, "Metro Manila" present with 17 cities, no province with zero cities. If the package's data fails that check, generate the same shape from the PSGC publication at psa.gov.ph instead and note the source at the top of the script. Commit the JSON; uninstall nothing.

- [ ] **Step 2: Write the failing test.**

```ts
// tests/shipping.test.ts
import { expect, test } from "vitest";
import { citiesOf, isValidLocation, provinces, regionGroupOf } from "@/lib/ph-locations";
import { shippingFee } from "@/lib/shipping";

const s = { freeShippingThreshold: 150000, gcashNumber: "", feeNcr: 8000, feeLuzon: 12000, feeVismin: 16000 };

test("region groups", () => {
  expect(regionGroupOf("Metro Manila")).toBe("ncr");
  expect(regionGroupOf("Benguet")).toBe("luzon");
  expect(regionGroupOf("Palawan")).toBe("luzon");
  expect(regionGroupOf("Cebu")).toBe("vismin");
  expect(regionGroupOf("Davao del Sur")).toBe("vismin");
  expect(regionGroupOf("Atlantis")).toBeNull();
});

test("every province has cities and pairs validate", () => {
  expect(provinces().length).toBeGreaterThanOrEqual(81);
  for (const p of provinces()) expect(citiesOf(p).length).toBeGreaterThan(0);
  expect(isValidLocation("Metro Manila", "Quezon City")).toBe(true);
  expect(isValidLocation("Cebu", "Quezon City")).toBe(false);
});

test("fee per region group below the threshold", () => {
  expect(shippingFee(50000, "ncr", s)).toBe(8000);
  expect(shippingFee(50000, "luzon", s)).toBe(12000);
  expect(shippingFee(50000, "vismin", s)).toBe(16000);
});

test("free at exactly the threshold, charged one centavo below", () => {
  expect(shippingFee(150000, "vismin", s)).toBe(0);
  expect(shippingFee(149999, "vismin", s)).toBe(16000);
});
```

- [ ] **Step 3: Run `npm test`.** Expected: FAIL.

- [ ] **Step 4: Implement.**

```ts
// lib/ph-locations.ts
import data from "@/data/ph-locations.json";

export type RegionGroup = "ncr" | "luzon" | "vismin";
const map = data as Record<string, { group: RegionGroup; cities: string[] }>;

export const provinces = () => Object.keys(map).sort((a, b) => a.localeCompare(b));
export const citiesOf = (province: string) => [...(map[province]?.cities ?? [])].sort((a, b) => a.localeCompare(b));
export const regionGroupOf = (province: string): RegionGroup | null => map[province]?.group ?? null;
export const isValidLocation = (province: string, city: string) => map[province]?.cities.includes(city) ?? false;
```

```ts
// lib/shipping.ts
import type { RegionGroup } from "./ph-locations";
import type { Settings } from "./settings";

export function shippingFee(subtotal: number, group: RegionGroup, s: Settings): number {
  if (subtotal >= s.freeShippingThreshold) return 0;
  return group === "ncr" ? s.feeNcr : group === "luzon" ? s.feeLuzon : s.feeVismin;
}
```

Add `"resolveJsonModule": true` to `tsconfig.json` if absent. Adjust city names in the test to match the data file's spelling if they differ (for example "Quezon City").

- [ ] **Step 5: Run `npm test`.** Expected: pass.
- [ ] **Step 6: Commit.** `feat: PH province/city data and shipping fee rule`

---

### Task 4: Products module

**Files:**
- Create: `lib/products.ts`, `tests/products.test.ts`

**Interfaces:**
- Consumes: `getDb`, `tx`.
- Produces:

```ts
export type Variant = { id: number; productId: number; name: string; stock: number; sku: string };
export type Product = {
  id: number; slug: string; name: string; category: string; description: string; howToUse: string;
  price: number; compareAt: number | null; images: string[]; featured: boolean; active: boolean;
  variants: Variant[];
};
export type ProductInput = Omit<Product, "id" | "variants"> & {
  variants: { id?: number; name: string; stock: number; sku: string }[];
};
export type SaveResult = { ok: true; id: number } | { ok: false; error: string; field: string };
export type CartLineInfo = {
  variantId: number; productName: string; variantName: string; slug: string;
  price: number; stock: number; image: string | null;
};

listProducts(opts?: { category?: string; q?: string; sort?: "featured" | "price-asc" | "price-desc"; includeInactive?: boolean }): Product[]
listCategories(): string[]                    // active products only
getProductBySlug(slug: string): Product | null   // active only
getProductById(id: number): Product | null       // any
relatedProducts(p: Product, n?: number): Product[]  // same category, active, excludes p; default 3
createProduct(input: ProductInput): SaveResult
updateProduct(id: number, input: ProductInput): SaveResult
removeProduct(id: number): "deleted" | "deactivated"
cartLineInfo(variantIds: number[]): CartLineInfo[]   // only variants of active products
lowStockVariants(max?: number): { variantId: number; productId: number; productName: string; variantName: string; stock: number }[]  // default 5
```

Rules to implement:
- `featured` sort: `featured DESC, id ASC`. `q` matches `name LIKE %q%`, case-insensitive.
- Validation in create/update, each returning `{ ok: false, field, error }`: `name` required; `slug` must match `/^[a-z0-9]+(-[a-z0-9]+)*$/`; duplicate slug → field `slug`, error "That slug is already used by another product."; `category` required; `price` a non-negative integer; at least one variant; each variant needs a name and an integer stock ≥ 0.
- `compareAt` that is null or not greater than `price` is stored as null.
- `updateProduct` runs in `tx`: variants with an `id` are updated, variants without are inserted, existing variants missing from the input are deleted.
- `removeProduct`: if any `order_items.product_id = id` exists, set `active = 0` and return `"deactivated"`; otherwise delete (variants cascade) and return `"deleted"`.
- `images` is stored as a JSON string; parse failures yield `[]`.

- [ ] **Step 1: Write failing tests** in `tests/products.test.ts` covering, with `beforeEach(freshDb)` and a local `sample(overrides?: Partial<ProductInput>): ProductInput` factory (slug `"benguet-arabica"`, price 45000, two variants "250g" stock 10 and "500g" stock 0):

```ts
test("create then read back by slug with variants", () => {
  const r = createProduct(sample());
  expect(r.ok).toBe(true);
  const p = getProductBySlug("benguet-arabica")!;
  expect(p.variants.map((v) => [v.name, v.stock])).toEqual([["250g", 10], ["500g", 0]]);
  expect(p.images).toEqual(sample().images);
});

test("duplicate slug is a field error", () => {
  createProduct(sample());
  expect(createProduct(sample())).toEqual({ ok: false, field: "slug", error: "That slug is already used by another product." });
});

test.each([
  [{ name: " " }, "name"], [{ slug: "Bad Slug" }, "slug"], [{ category: "" }, "category"],
  [{ price: -1 }, "price"], [{ price: 10.5 }, "price"], [{ variants: [] }, "variants"],
  [{ variants: [{ name: "", stock: 1, sku: "" }] }, "variants"],
  [{ variants: [{ name: "A", stock: -1, sku: "" }] }, "variants"],
])("invalid input %j is rejected on %s", (over, field) => {
  expect(createProduct(sample(over as Partial<ProductInput>))).toMatchObject({ ok: false, field });
});

test("compare-at not above price is stored as null", () => {
  createProduct(sample({ compareAt: 45000 }));
  expect(getProductBySlug("benguet-arabica")!.compareAt).toBeNull();
});

test("update adds, edits and removes variants", () => {
  const { id } = createProduct(sample()) as { ok: true; id: number };
  const before = getProductById(id)!;
  updateProduct(id, { ...sample(), variants: [{ id: before.variants[0].id, name: "250g", stock: 7, sku: "" }, { name: "1kg", stock: 3, sku: "" }] });
  expect(getProductById(id)!.variants.map((v) => [v.name, v.stock])).toEqual([["250g", 7], ["1kg", 3]]);
});

test("inactive products are hidden from the storefront queries", () => {
  createProduct(sample({ active: false }));
  expect(getProductBySlug("benguet-arabica")).toBeNull();
  expect(listProducts()).toHaveLength(0);
  expect(listProducts({ includeInactive: true })).toHaveLength(1);
});

test("filter, search and sort", () => {
  createProduct(sample());
  createProduct(sample({ slug: "wild-honey", name: "Wild Honey", category: "Pantry", price: 30000, featured: true }));
  expect(listProducts({ category: "Pantry" }).map((p) => p.slug)).toEqual(["wild-honey"]);
  expect(listProducts({ q: "HONEY" }).map((p) => p.slug)).toEqual(["wild-honey"]);
  expect(listProducts({ sort: "price-desc" }).map((p) => p.price)).toEqual([45000, 30000]);
  expect(listProducts({ sort: "featured" })[0].slug).toBe("wild-honey");
});

test("removeProduct deletes when there is no order history", () => {
  const { id } = createProduct(sample()) as { ok: true; id: number };
  expect(removeProduct(id)).toBe("deleted");
  expect(getProductById(id)).toBeNull();
});

test("cartLineInfo skips unknown ids and inactive products", () => {
  const { id } = createProduct(sample()) as { ok: true; id: number };
  const vid = getProductById(id)!.variants[0].id;
  expect(cartLineInfo([vid, 99999]).map((l) => l.variantId)).toEqual([vid]);
  updateProduct(id, { ...sample(), active: false, variants: getProductById(id)!.variants });
  expect(cartLineInfo([vid])).toEqual([]);
});
```

(The "deactivated when it has orders" case is tested in Task 6, once orders exist.)

- [ ] **Step 2: Run, expect FAIL. Step 3: Implement `lib/products.ts` to the interface and rules above. Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit.** `feat: products module with validation and variant upsert`

---

### Task 5: Placing an order

**Files:**
- Create: `lib/order-code.ts`, `lib/orders.ts`, `tests/place-order.test.ts`, `tests/order-code.test.ts`

**Interfaces:**
- Consumes: `tx`, `getSettings`, `shippingFee`, `regionGroupOf`, `isValidLocation`, `manilaYYMM`, `brand.prefix`, `createProduct`/`getProductById` (tests only).
- Produces:

```ts
export type OrderInput = {
  customerName: string; mobile: string; province: string; city: string; address: string;
  notes?: string; paymentMethod: "cod" | "gcash"; gcashRef?: string;
  lines: { variantId: number; qty: number }[];
};
export type PlaceResult = { ok: true; code: string } | { ok: false; error: string; field: string };
placeOrder(input: OrderInput, now?: Date): PlaceResult
nextOrderCode(db: DatabaseSync, now: Date): string
```

- [ ] **Step 1: Write failing tests.**

```ts
// tests/order-code.test.ts
import { beforeEach, expect, test } from "vitest";
import { getDb } from "@/lib/db";
import { nextOrderCode } from "@/lib/order-code";
import { freshDb } from "./helpers";

beforeEach(freshDb);

function insertCode(code: string) {
  getDb().prepare(
    `INSERT INTO orders (code, customer_name, mobile, province, city, address, payment_method,
     shipping_fee, subtotal, total, created_at) VALUES (?, 'x','x','x','x','x','cod',0,0,0,'2026-10-01T00:00:00.000Z')`,
  ).run(code);
}

test("first code of a month is 0001", () => {
  expect(nextOrderCode(getDb(), new Date("2026-10-04T03:00:00Z"))).toBe("BL-2610-0001");
});

test("continues from the highest number in the month and restarts next month", () => {
  insertCode("BL-2610-0001"); insertCode("BL-2610-0007");
  expect(nextOrderCode(getDb(), new Date("2026-10-04T03:00:00Z"))).toBe("BL-2610-0008");
  expect(nextOrderCode(getDb(), new Date("2026-11-02T03:00:00Z"))).toBe("BL-2611-0001");
});

test("counts numerically past 9999", () => {
  insertCode("BL-2610-9999"); insertCode("BL-2610-10000");
  expect(nextOrderCode(getDb(), new Date("2026-10-04T03:00:00Z"))).toBe("BL-2610-10001");
});
```

```ts
// tests/place-order.test.ts
import { beforeEach, expect, test } from "vitest";
import { getDb } from "@/lib/db";
import { placeOrder, type OrderInput } from "@/lib/orders";
import { createProduct, getProductById, updateProduct, type ProductInput } from "@/lib/products";
import { freshDb } from "./helpers";

const NOW = new Date("2026-10-04T03:00:00Z");
let v250: number, v500: number, productId: number;

const product: ProductInput = {
  slug: "benguet-arabica", name: "Benguet Arabica", category: "Coffee", description: "", howToUse: "",
  price: 50000, compareAt: null, images: [], featured: false, active: true,
  variants: [{ name: "250g", stock: 5, sku: "" }, { name: "500g", stock: 1, sku: "" }],
};

function order(over: Partial<OrderInput> = {}): OrderInput {
  return {
    customerName: "Ana Reyes", mobile: "09171234567", province: "Metro Manila", city: "Quezon City",
    address: "12 Mabini St", paymentMethod: "cod", lines: [{ variantId: v250, qty: 1 }], ...over,
  };
}
const stock = (id: number) => (getDb().prepare("SELECT stock FROM variants WHERE id = ?").get(id) as { stock: number }).stock;
const orderCount = () => (getDb().prepare("SELECT COUNT(*) c FROM orders").get() as { c: number }).c;

beforeEach(() => {
  freshDb();
  productId = (createProduct(product) as { ok: true; id: number }).id;
  [v250, v500] = getProductById(productId)!.variants.map((v) => v.id);
});

test("places an order: totals, status, code, stock decrement, snapshots", () => {
  const r = placeOrder(order({ lines: [{ variantId: v250, qty: 2 }] }), NOW);
  expect(r).toEqual({ ok: true, code: "BL-2610-0001" });
  const o = getDb().prepare("SELECT * FROM orders").get() as Record<string, unknown>;
  expect(o).toMatchObject({ subtotal: 100000, shipping_fee: 8000, total: 108000, status: "new", gcash_ref: null, created_at: NOW.toISOString() });
  expect(stock(v250)).toBe(3);
  expect(getDb().prepare("SELECT name_snapshot, price_snapshot, qty FROM order_items").all())
    .toEqual([{ name_snapshot: "Benguet Arabica — 250g", price_snapshot: 50000, qty: 2 }]);
});

test("free shipping at exactly ₱1,500, charged just below", () => {
  placeOrder(order({ lines: [{ variantId: v250, qty: 3 }] }), NOW); // 150000
  placeOrder(order({ lines: [{ variantId: v250, qty: 2 }] }), NOW); // 100000
  const fees = getDb().prepare("SELECT shipping_fee FROM orders ORDER BY id").all().map((r) => r.shipping_fee);
  expect(fees).toEqual([0, 8000]);
});

test("shipping fee follows the province's region group", () => {
  placeOrder(order({ province: "Cebu", city: "Cebu City" }), NOW);
  expect((getDb().prepare("SELECT shipping_fee f FROM orders").get() as { f: number }).f).toBe(16000);
});

test("insufficient stock rejects the whole order and changes nothing", () => {
  const r = placeOrder(order({ lines: [{ variantId: v250, qty: 1 }, { variantId: v500, qty: 2 }] }), NOW);
  expect(r).toMatchObject({ ok: false, field: "lines" });
  expect((r as { error: string }).error).toContain("Benguet Arabica — 500g");
  expect([stock(v250), stock(v500), orderCount()]).toEqual([5, 1, 0]);
});

test("the last unit can only be bought once", () => {
  expect(placeOrder(order({ lines: [{ variantId: v500, qty: 1 }] }), NOW).ok).toBe(true);
  expect(placeOrder(order({ lines: [{ variantId: v500, qty: 1 }] }), NOW).ok).toBe(false);
  expect(stock(v500)).toBe(0);
});

test("duplicate lines for one variant are merged before the stock check", () => {
  const r = placeOrder(order({ lines: [{ variantId: v250, qty: 3 }, { variantId: v250, qty: 3 }] }), NOW);
  expect(r.ok).toBe(false);
  expect(stock(v250)).toBe(5);
});

test.each([0, -1, 1.5, 1000, Number.NaN])("qty %s is rejected", (qty) => {
  expect(placeOrder(order({ lines: [{ variantId: v250, qty }] }), NOW)).toMatchObject({ ok: false, field: "lines" });
  expect(stock(v250)).toBe(5);
});

test("empty cart, unknown variant and inactive product are rejected", () => {
  expect(placeOrder(order({ lines: [] }), NOW)).toMatchObject({ ok: false, field: "lines" });
  expect(placeOrder(order({ lines: [{ variantId: 99999, qty: 1 }] }), NOW)).toMatchObject({ ok: false, field: "lines" });
  updateProduct(productId, { ...product, active: false, variants: getProductById(productId)!.variants });
  expect(placeOrder(order(), NOW)).toMatchObject({ ok: false, field: "lines" });
});

test.each([
  [{ customerName: "  " }, "customerName"], [{ mobile: "9171234567" }, "mobile"], [{ mobile: "0917123456a" }, "mobile"],
  [{ province: "Atlantis" }, "province"], [{ city: "Cebu City" }, "city"], [{ address: "" }, "address"],
  [{ paymentMethod: "card" as never }, "paymentMethod"],
])("contact validation %j -> %s", (over, field) => {
  expect(placeOrder(order(over), NOW)).toMatchObject({ ok: false, field });
  expect(orderCount()).toBe(0);
});

test("GCash requires a reference and stores it trimmed; COD stores null", () => {
  expect(placeOrder(order({ paymentMethod: "gcash" }), NOW)).toMatchObject({ ok: false, field: "gcashRef" });
  expect(placeOrder(order({ paymentMethod: "gcash", gcashRef: "   " }), NOW)).toMatchObject({ ok: false, field: "gcashRef" });
  placeOrder(order({ paymentMethod: "gcash", gcashRef: " 1234567890123 " }), NOW);
  placeOrder(order({ paymentMethod: "cod", gcashRef: "ignored" }), NOW);
  expect(getDb().prepare("SELECT gcash_ref FROM orders ORDER BY id").all().map((r) => r.gcash_ref)).toEqual(["1234567890123", null]);
});

test("price comes from the database at purchase time and later edits do not rewrite the order", () => {
  placeOrder(order(), NOW);
  updateProduct(productId, { ...product, name: "Renamed", price: 99900, variants: getProductById(productId)!.variants });
  expect(getDb().prepare("SELECT name_snapshot, price_snapshot FROM order_items").get())
    .toEqual({ name_snapshot: "Benguet Arabica — 250g", price_snapshot: 50000 });
});

test("mobile with spaces or dashes is normalised", () => {
  placeOrder(order({ mobile: "0917 123-4567" }), NOW);
  expect((getDb().prepare("SELECT mobile m FROM orders").get() as { m: string }).m).toBe("09171234567");
});
```

- [ ] **Step 2: Run `npm test`.** Expected: FAIL, modules not found.

- [ ] **Step 3: Implement.**

```ts
// lib/order-code.ts
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
```

```ts
// lib/orders.ts
import { tx } from "./db";
import { nextOrderCode } from "./order-code";
import { isValidLocation, regionGroupOf } from "./ph-locations";
import { getSettings } from "./settings";
import { shippingFee } from "./shipping";

export type OrderInput = {
  customerName: string; mobile: string; province: string; city: string; address: string;
  notes?: string; paymentMethod: "cod" | "gcash"; gcashRef?: string;
  lines: { variantId: number; qty: number }[];
};
export type PlaceResult = { ok: true; code: string } | { ok: false; error: string; field: string };

const MAX_QTY_PER_LINE = 99;

class OrderError extends Error {
  constructor(message: string, public field: string) { super(message); }
}
const fail = (field: string, error: string): PlaceResult => ({ ok: false, field, error });

export function placeOrder(input: OrderInput, now: Date = new Date()): PlaceResult {
  const customerName = input.customerName?.trim() ?? "";
  const mobile = (input.mobile ?? "").replace(/[\s-]/g, "");
  const address = input.address?.trim() ?? "";
  const gcashRef = input.gcashRef?.trim() ?? "";

  if (!customerName) return fail("customerName", "Enter your name.");
  if (!/^09\d{9}$/.test(mobile)) return fail("mobile", "Enter an 11-digit mobile number starting with 09.");
  const group = regionGroupOf(input.province);
  if (!group) return fail("province", "Choose a province.");
  if (!isValidLocation(input.province, input.city)) return fail("city", "Choose a city or municipality.");
  if (!address) return fail("address", "Enter your street address.");
  if (input.paymentMethod !== "cod" && input.paymentMethod !== "gcash") return fail("paymentMethod", "Choose a payment method.");
  if (input.paymentMethod === "gcash" && !gcashRef) return fail("gcashRef", "Enter your GCash reference number.");

  const merged = new Map<number, number>();
  for (const l of input.lines ?? []) {
    if (!Number.isInteger(l.variantId) || !Number.isInteger(l.qty) || l.qty < 1 || l.qty > MAX_QTY_PER_LINE)
      return fail("lines", "One of the quantities in your cart is not valid.");
    merged.set(l.variantId, (merged.get(l.variantId) ?? 0) + l.qty);
  }
  if (merged.size === 0) return fail("lines", "Your cart is empty.");

  try {
    return tx((db) => {
      const find = db.prepare(
        `SELECT v.name AS vname, p.id AS pid, p.name AS pname, p.price, p.active
         FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?`,
      );
      const take = db.prepare("UPDATE variants SET stock = stock - ? WHERE id = ? AND stock >= ?");
      const items: { pid: number; vid: number; name: string; price: number; qty: number }[] = [];
      let subtotal = 0;

      for (const [variantId, qty] of merged) {
        const row = find.get(variantId) as { vname: string; pid: number; pname: string; price: number; active: number } | undefined;
        if (!row || !row.active) throw new OrderError("An item in your cart is no longer available.", "lines");
        const name = `${row.pname} — ${row.vname}`;
        if (take.run(qty, variantId, qty).changes === 0)
          throw new OrderError(`Sorry, ${name} doesn't have enough stock left.`, "lines");
        items.push({ pid: row.pid, vid: variantId, name, price: row.price, qty });
        subtotal += row.price * qty;
      }

      const fee = shippingFee(subtotal, group, getSettings());
      const code = nextOrderCode(db, now);
      const orderId = db.prepare(
        `INSERT INTO orders (code, customer_name, mobile, province, city, address, notes, payment_method,
           gcash_ref, shipping_fee, subtotal, total, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
      ).run(code, customerName, mobile, input.province, input.city, address, input.notes?.trim() ?? "",
        input.paymentMethod, input.paymentMethod === "gcash" ? gcashRef : null,
        fee, subtotal, subtotal + fee, now.toISOString()).lastInsertRowid;

      const addItem = db.prepare(
        "INSERT INTO order_items (order_id, product_id, variant_id, name_snapshot, price_snapshot, qty) VALUES (?, ?, ?, ?, ?, ?)",
      );
      for (const i of items) addItem.run(orderId, i.pid, i.vid, i.name, i.price, i.qty);
      return { ok: true as const, code };
    });
  } catch (e) {
    if (e instanceof OrderError) return fail(e.field, e.message);
    throw e;
  }
}
```

- [ ] **Step 4: Run `npm test`.** Expected: all pass. (`getSettings()` inside `tx` uses the same connection, so it is safe.)
- [ ] **Step 5: Commit.** `feat: atomic order placement with stock decrement and snapshots`

---

### Task 6: Order status, cancel, admin queries

**Files:**
- Modify: `lib/orders.ts`
- Create: `tests/order-status.test.ts`

**Interfaces:**
- Consumes: `placeOrder`, `tx`, `getDb`, `manilaDayRange`, `removeProduct`.
- Produces (added to `lib/orders.ts`):

```ts
export type OrderStatus = "new" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type OrderItem = { id: number; productId: number; variantId: number; name: string; price: number; qty: number };
export type Order = {
  id: number; code: string; customerName: string; mobile: string; province: string; city: string;
  address: string; notes: string; adminNotes: string; paymentMethod: "cod" | "gcash"; gcashRef: string | null;
  shippingFee: number; subtotal: number; total: number; status: OrderStatus; createdAt: string; items: OrderItem[];
};
nextStatuses(s: OrderStatus): OrderStatus[]   // new->[confirmed,cancelled], confirmed->[shipped,cancelled], shipped->[delivered,cancelled], delivered->[], cancelled->[]
changeStatus(id: number, to: OrderStatus): { ok: true } | { ok: false; error: string }
getOrder(id: number): Order | null
getOrderByCode(code: string): Order | null
listOrders(opts?: { status?: OrderStatus }): Omit<Order, "items">[]   // newest first
setAdminNotes(id: number, notes: string): void
dashboardStats(now?: Date): { todayOrders: Omit<Order, "items">[]; todayRevenue: number; pendingCount: number }
```

Rules: `changeStatus` runs in `tx`, re-reads the current status inside the transaction, and rejects any target not in `nextStatuses(current)` with "This order can't move from X to Y." When the target is `cancelled`, for each item run `UPDATE variants SET stock = stock + ? WHERE id = ?` (a missing variant simply updates zero rows). `todayRevenue` sums `total` of today's orders (Manila day) whose status is not `cancelled`; `todayOrders` includes cancelled ones; `pendingCount` counts all orders with status `new`, any date.

- [ ] **Step 1: Write failing tests** in `tests/order-status.test.ts`, reusing the same `product`, `order()`, `stock()` and `beforeEach` setup as `tests/place-order.test.ts` (copy them into this file):

```ts
const idOf = (code: string) => getOrderByCode(code)!.id;
const place = (over: Partial<OrderInput> = {}, now = NOW) => idOf((placeOrder(order(over), now) as { ok: true; code: string }).code);

test("walks new -> confirmed -> shipped -> delivered", () => {
  const id = place();
  for (const s of ["confirmed", "shipped", "delivered"] as const) expect(changeStatus(id, s)).toEqual({ ok: true });
  expect(getOrder(id)!.status).toBe("delivered");
});

test.each([["new", "shipped"], ["new", "delivered"], ["confirmed", "new"]] as const)("rejects %s -> %s", (from, to) => {
  const id = place();
  if (from === "confirmed") changeStatus(id, "confirmed");
  expect(changeStatus(id, to).ok).toBe(false);
  expect(getOrder(id)!.status).toBe(from);
});

test("cancel restocks, exactly once, and is final", () => {
  const id = place({ lines: [{ variantId: v250, qty: 2 }] });
  expect(stock(v250)).toBe(3);
  expect(changeStatus(id, "cancelled")).toEqual({ ok: true });
  expect(stock(v250)).toBe(5);
  expect(changeStatus(id, "cancelled").ok).toBe(false);
  expect(changeStatus(id, "confirmed").ok).toBe(false);
  expect(stock(v250)).toBe(5);
});

test("delivered orders cannot be cancelled", () => {
  const id = place();
  for (const s of ["confirmed", "shipped", "delivered"] as const) changeStatus(id, s);
  expect(changeStatus(id, "cancelled").ok).toBe(false);
  expect(stock(v250)).toBe(4);
});

test("cancel survives a variant that was removed after the order", () => {
  const id = place({ lines: [{ variantId: v500, qty: 1 }] });
  const keep = getProductById(productId)!.variants.filter((v) => v.id === v250);
  updateProduct(productId, { ...product, variants: keep });
  expect(changeStatus(id, "cancelled")).toEqual({ ok: true });
});

test("unknown order id", () => {
  expect(changeStatus(424242, "confirmed").ok).toBe(false);
  expect(getOrder(424242)).toBeNull();
});

test("a product with order history is deactivated, not deleted", () => {
  const id = place();
  expect(removeProduct(productId)).toBe("deactivated");
  expect(getProductById(productId)!.active).toBe(false);
  expect(getOrder(id)!.items[0].name).toBe("Benguet Arabica — 250g");
});

test("dashboard: Manila-day orders, revenue without cancelled, pending count", () => {
  place({}, new Date("2026-10-03T15:00:00Z"));               // Oct 3, 23:00 Manila -> yesterday
  place({ lines: [{ variantId: v250, qty: 1 }] }, NOW);      // today, 58000
  const cancelled = place({ lines: [{ variantId: v250, qty: 1 }] }, NOW);
  changeStatus(cancelled, "cancelled");
  const d = dashboardStats(NOW);
  expect(d.todayOrders).toHaveLength(2);
  expect(d.todayRevenue).toBe(58000);
  expect(d.pendingCount).toBe(2);
});

test("listOrders filters by status, newest first; admin notes save", () => {
  const a = place({}, new Date("2026-10-01T03:00:00Z"));
  const b = place({}, NOW);
  changeStatus(a, "confirmed");
  expect(listOrders().map((o) => o.id)).toEqual([b, a]);
  expect(listOrders({ status: "confirmed" }).map((o) => o.id)).toEqual([a]);
  setAdminNotes(a, "Called customer");
  expect(getOrder(a)!.adminNotes).toBe("Called customer");
});
```

- [ ] **Step 2: Run, expect FAIL. Step 3: Implement to the interface and rules. Step 4: Run, expect all tests PASS.**
- [ ] **Step 5: Commit.** `feat: order status flow, cancel with restock, dashboard queries`

---

### Task 7: Seed

**Files:**
- Create: `scripts/seed.ts`, `lib/seed-data.ts`, `tests/seed.test.ts`

**Interfaces:**
- Consumes: `createProduct`, `placeOrder(input, now)`, `changeStatus`, `updateSettings`, `getDb`.
- Produces: `seed(now?: Date): void` exported from `lib/seed-data.ts` (wipes all five tables, then fills them); `scripts/seed.ts` calls `seed()` and prints counts.

Products (prices in ₱; write a 2–3 sentence description and a how-to-use note for each; 2–3 Unsplash image URLs each in the form `https://images.unsplash.com/photo-<id>?auto=format&fit=crop&w=1200&q=70`):

| Category | Name | Price | Compare-at | Variants (stock) | Featured |
|---|---|---|---|---|---|
| Coffee | Benguet Arabica | 480 | 550 | 250g (24), 500g (10) | yes |
| Coffee | Sagada Dark Roast | 520 | – | 250g (18), 500g (4) | yes |
| Coffee | Mt. Apo Natural | 650 | – | 250g (12), 500g (0) | no |
| Coffee | Batangas Barako | 390 | 450 | 250g (30), 500g (15) | no |
| Tablea & Cacao | Davao Tablea Discs | 320 | – | Pure 100% (20), Muscovado-sweetened (14), Sili-spiced (3) | yes |
| Tablea & Cacao | Drinking Chocolate | 420 | 480 | Classic (16), Sea Salt (9), Barako Mocha (11) | no |
| Tablea & Cacao | Roasted Cacao Nibs | 360 | – | Plain (22), Coco Sugar-glazed (8) | no |
| Tablea & Cacao | Cacao Husk Tea | 280 | – | Original (25), Pandan (12) | no |
| Pantry | Wild Forest Honey | 450 | – | 250ml (15), 500ml (6) | yes |
| Pantry | Coconut Sugar | 240 | 290 | 500g (40), 1kg (18) | no |
| Pantry | Negros Muscovado | 210 | – | 500g (35), 1kg (5) | no |
| Pantry | Spiced Coconut Vinegar | 190 | – | 375ml (28), 750ml (13) | no |

Orders: 15 orders with fixed customer names and addresses across Metro Manila, Cebu, Benguet, Davao del Sur and Laguna, created at `now` minus 1, 2, 3, 5, 8, 12, 15, 19, 23, 28, 34, 41, 47, 53 and 59 days, placed through `placeOrder(input, date)` so totals, codes and stock are real. Then move them with `changeStatus` to: 3 new, 3 confirmed, 3 shipped, 4 delivered, 2 cancelled. Six use GCash with 13-digit references. Stock numbers in the table are the values **before** the seeded orders.

- [ ] **Step 1: Write the failing test.**

```ts
// tests/seed.test.ts
import { beforeEach, expect, test } from "vitest";
import { getDb } from "@/lib/db";
import { listOrders } from "@/lib/orders";
import { listCategories, listProducts } from "@/lib/products";
import { seed } from "@/lib/seed-data";
import { freshDb } from "./helpers";

beforeEach(freshDb);

test("seed creates 12 products in 3 categories and 15 mixed-status orders", () => {
  seed(new Date("2026-10-04T03:00:00Z"));
  expect(listProducts()).toHaveLength(12);
  expect(listCategories().sort()).toEqual(["Coffee", "Pantry", "Tablea & Cacao"]);
  const orders = listOrders();
  expect(orders).toHaveLength(15);
  expect(new Set(orders.map((o) => o.status)).size).toBe(5);
  for (const o of orders) expect(o.total).toBe(o.subtotal + o.shippingFee);
  expect(orders.filter((o) => o.paymentMethod === "gcash").every((o) => o.gcashRef)).toBe(true);
  expect((getDb().prepare("SELECT MIN(stock) m FROM variants").get() as { m: number }).m).toBe(0);
});

test("seeding twice gives the same counts", () => {
  seed(); seed();
  expect(listProducts()).toHaveLength(12);
  expect(listOrders()).toHaveLength(15);
});
```

- [ ] **Step 2: Run, expect FAIL. Step 3: Implement. Step 4: Run, expect PASS.**
- [ ] **Step 5: Check every image URL.** Run a one-off `node -e` loop that `fetch`es each seeded URL with `method: "HEAD"` and prints any non-200. Replace broken ones.
- [ ] **Step 6: Run `npm run seed`.** Expected output: `Seeded 12 products, 15 orders.` and `data/store.db` exists.
- [ ] **Step 7: Commit.** `feat: seed with 12 products and 15 historical orders`

---

### Task 8: Storefront shell, home, shop, product page

**Files:**
- Create: `app/(store)/layout.tsx`, `app/(store)/page.tsx`, `app/(store)/shop/page.tsx`, `app/(store)/product/[slug]/page.tsx`, `app/not-found.tsx`, `components/store/{header,footer,product-card,product-image,shop-filters,product-gallery,purchase-panel,product-tabs,empty-state}.tsx`, `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/browse.spec.ts`, `e2e/empty.spec.ts`
- Delete: the scaffold's `app/page.tsx`

**Interfaces:**
- Consumes: `listProducts`, `listCategories`, `getProductBySlug`, `relatedProducts`, `brand`, `formatPeso`, `getSettings`.
- Produces: `<PurchasePanel product={Product} />` (client) which, in Task 9, calls `addToCart`; in this task its button is rendered but only logs. `<ProductImage src alt sizes priority? />` wraps `next/image` and sets `unoptimized` when the host is not `images.unsplash.com`. `<EmptyState title body action? />`.

Requirements:
- `app/(store)/layout.tsx` exports `dynamic = "force-dynamic"`. Header: brand wordmark, Shop link, cart button with `aria-label="Open cart"` and a count badge (wired in Task 9). Footer: FAQ accordion from `brand.faqs`, shipping line, copyright.
- `/`: hero uses the first featured product (image `priority`, name, price, "Shop now" link to its page) plus `brand.promise`; best-sellers row = featured products (horizontal scroll-snap on mobile, grid from `md`); one tile per category linking to `/shop?category=<name>`; story band; six-image gallery from `brand.gallery`. With zero products: hero shows brand name and tagline with `<EmptyState title="Products coming soon" …/>` instead of the product sections.
- `/shop`: reads `category`, `sort`, `q` from `await searchParams`. `<ShopFilters>` is a `<form method="get">` with a search input, category `<select>` and sort `<select>` that submits on change, so it works without client JS state. Empty result: `<EmptyState title="No products found" …/>` with a "Clear filters" link.
- `/product/[slug]`: `notFound()` when `getProductBySlug` returns null. Gallery (main image + thumbnail buttons), name, price, compare-at in `<s>` when present, `<PurchasePanel>` with variant buttons (`role="radio"`, sold-out ones `disabled` with the text "Sold out"), qty stepper clamped to 1…selected variant stock, "Add to cart" button disabled when every variant is sold out. First in-stock variant is preselected. Tabs: Details (`description`), How to use (`howToUse`), Shipping (`brand.shippingCopy`). Three related products.
- All tap targets at least 44×44px. No horizontal scroll at 375px.

- [ ] **Step 1: Write `playwright.config.ts` and `e2e/global-setup.ts`.**

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const next = "node node_modules/next/dist/bin/next start -p";
export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  use: { ...devices["Pixel 5"], viewport: { width: 375, height: 812 }, baseURL: "http://localhost:3218" },
  webServer: [
    { command: `${next} 3218`, url: "http://localhost:3218", reuseExistingServer: false,
      env: { DB_PATH: "data/e2e.db", ADMIN_PASSWORD: "e2e-admin-pass" } },
    { command: `${next} 3219`, url: "http://localhost:3219", reuseExistingServer: false,
      env: { DB_PATH: "data/e2e-empty.db", ADMIN_PASSWORD: "e2e-admin-pass" } },
  ],
});
```

```ts
// e2e/global-setup.ts
import fs from "node:fs";

export default async function globalSetup() {
  for (const f of ["data/e2e.db", "data/e2e-empty.db"])
    for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(f + suffix, { force: true });
  process.env.DB_PATH = "data/e2e.db";
  const { seed } = await import("../lib/seed-data");
  const { closeDb } = await import("../lib/db");
  seed();
  closeDb();
}
```

If Playwright's TypeScript loader cannot resolve the `@/` alias inside `lib/`, switch the imports within `lib/` to relative paths (they already are in the code above except `@/data/ph-locations.json` — make that `../data/ph-locations.json`).

- [ ] **Step 2: Write failing e2e tests.**

```ts
// e2e/browse.spec.ts
import { expect, test } from "@playwright/test";

test("home shows hero product, best sellers and categories", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /shop now/i })).toBeVisible();
  for (const c of ["Coffee", "Tablea & Cacao", "Pantry"])
    await expect(page.getByRole("link", { name: new RegExp(c) }).first()).toBeVisible();
});

test("no horizontal scroll at 375px on home, shop and product", async ({ page }) => {
  for (const url of ["/", "/shop", "/product/benguet-arabica"]) {
    await page.goto(url);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("shop filters by category, searches and sorts by price", async ({ page }) => {
  await page.goto("/shop?category=Pantry");
  await expect(page.getByTestId("product-card")).toHaveCount(4);
  await page.goto("/shop?q=honey");
  await expect(page.getByTestId("product-card")).toHaveCount(1);
  await page.goto("/shop?sort=price-asc");
  await expect(page.getByTestId("product-card").first()).toContainText("Spiced Coconut Vinegar");
  await page.goto("/shop?q=zzzz");
  await expect(page.getByText("No products found")).toBeVisible();
});

test("product page: compare-at, sold-out variant disabled, related products", async ({ page }) => {
  await page.goto("/product/benguet-arabica");
  await expect(page.locator("s")).toContainText("₱550");
  await page.goto("/product/mt-apo-natural");
  await expect(page.getByRole("radio", { name: /500g/ })).toBeDisabled();
  await expect(page.getByTestId("related").getByTestId("product-card")).toHaveCount(3);
});

test("unknown product is a 404", async ({ page }) => {
  expect((await page.goto("/product/nope"))!.status()).toBe(404);
});
```

```ts
// e2e/empty.spec.ts
import { expect, test } from "@playwright/test";

test.use({ baseURL: "http://localhost:3219" });

test("unseeded database renders designed empty states", async ({ page }) => {
  expect((await page.goto("/"))!.status()).toBe(200);
  await expect(page.getByText("Products coming soon")).toBeVisible();
  expect((await page.goto("/shop"))!.status()).toBe(200);
  await expect(page.getByText("No products found")).toBeVisible();
});
```

- [ ] **Step 3: Run `npm run e2e`.** Expected: FAIL (pages not built).
- [ ] **Step 4: Build the components and pages to the requirements above.** Add `data-testid="product-card"` on the card root and `data-testid="related"` on the related section.
- [ ] **Step 5: Run `npm run typecheck`, `npm run lint`, `npm run e2e`.** Expected: all pass.
- [ ] **Step 6: Commit.** `feat: storefront home, shop and product pages`

---

### Task 9: Cart store and drawer

**Files:**
- Create: `lib/cart.ts`, `actions/cart.ts`, `components/store/{cart-provider,cart-drawer,shipping-progress,qty-stepper}.tsx`, `tests/cart.test.ts`, `e2e/cart.spec.ts`
- Modify: `app/(store)/layout.tsx`, `components/store/header.tsx`, `components/store/purchase-panel.tsx`

**Interfaces:**
- Consumes: `cartLineInfo`, `CartLineInfo`, `getSettings`, `formatPeso`.
- Produces:

```ts
// lib/cart.ts — pure functions, no React, no window access except in load/save
export type CartLine = { variantId: number; qty: number; productName: string; variantName: string; slug: string; price: number; image: string | null; stock: number };
export const CART_KEY = "bl-cart-v1";
parseCart(raw: string | null): CartLine[]          // [] on null, invalid JSON, non-array, or bad entries (bad entries dropped)
addLine(cart: CartLine[], line: CartLine): CartLine[]   // merges by variantId, qty clamped to 1..stock
setQty(cart: CartLine[], variantId: number, qty: number): CartLine[]  // qty <= 0 removes; clamped to stock
reconcile(cart: CartLine[], fresh: CartLineInfo[]): { cart: CartLine[]; removed: string[]; reduced: string[] }
subtotalOf(cart: CartLine[]): number
countOf(cart: CartLine[]): number
// actions/cart.ts
"use server"; export async function refreshCart(variantIds: number[]): Promise<CartLineInfo[]>
// components/store/cart-provider.tsx
useCart(): { lines: CartLine[]; ready: boolean; add(line: CartLine): void; setQty(variantId: number, qty: number): void; clear(): void; open(): void; notices: string[] }
```

`reconcile`: a cart line whose variant is absent from `fresh` or has stock 0 is removed and its "Product — Variant" name goes in `removed`; a line whose qty exceeds fresh stock is lowered and goes in `reduced`; name, price, image and stock are refreshed from `fresh`.

- [ ] **Step 1: Write failing unit tests `tests/cart.test.ts`.**

```ts
import { expect, test } from "vitest";
import { addLine, countOf, parseCart, reconcile, setQty, subtotalOf, type CartLine } from "@/lib/cart";

const line = (over: Partial<CartLine> = {}): CartLine => ({
  variantId: 1, qty: 1, productName: "Benguet Arabica", variantName: "250g", slug: "benguet-arabica",
  price: 48000, image: null, stock: 5, ...over,
});
const info = (over = {}) => ({ variantId: 1, productName: "Benguet Arabica", variantName: "250g", slug: "benguet-arabica", price: 48000, stock: 5, image: null, ...over });

test.each([null, "", "not json", "{}", "42", '[{"variantId":"x"}]', '[{"variantId":1,"qty":0}]', "[null]"])(
  "parseCart(%j) is an empty cart", (raw) => expect(parseCart(raw)).toEqual([]),
);

test("parseCart keeps good lines and drops bad ones", () => {
  expect(parseCart(JSON.stringify([line(), { variantId: 2 }]))).toEqual([line()]);
});

test("addLine merges by variant and clamps to stock", () => {
  expect(addLine([line({ qty: 4 })], line({ qty: 3 }))[0].qty).toBe(5);
  expect(addLine([], line({ variantId: 2 }))).toHaveLength(1);
});

test("setQty clamps and removes at zero", () => {
  expect(setQty([line()], 1, 99)[0].qty).toBe(5);
  expect(setQty([line()], 1, 0)).toEqual([]);
});

test("reconcile removes dead lines, lowers qty and refreshes price", () => {
  const cart = [line({ qty: 4 }), line({ variantId: 2, variantName: "500g" }), line({ variantId: 3, variantName: "1kg" })];
  const r = reconcile(cart, [info({ stock: 2, price: 50000 }), info({ variantId: 3, variantName: "1kg", stock: 0 })]);
  expect(r.cart).toEqual([line({ qty: 2, stock: 2, price: 50000 })]);
  expect(r.removed).toEqual(["Benguet Arabica — 500g", "Benguet Arabica — 1kg"]);
  expect(r.reduced).toEqual(["Benguet Arabica — 250g"]);
});

test("subtotal and count", () => {
  const cart = [line({ qty: 2 }), line({ variantId: 2, price: 10000 })];
  expect([subtotalOf(cart), countOf(cart)]).toEqual([106000, 3]);
});
```

- [ ] **Step 2: Run, expect FAIL. Step 3: Implement `lib/cart.ts`. Step 4: Run, expect PASS.**

- [ ] **Step 5: Write failing `e2e/cart.spec.ts`.**

```ts
import { expect, test } from "@playwright/test";

test("add to cart, change qty, free-shipping bar, persistence", async ({ page }) => {
  await page.goto("/product/benguet-arabica");           // ₱480
  await page.getByRole("button", { name: "Add to cart" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText("Benguet Arabica");
  await expect(drawer).toContainText("₱1,020 away from free shipping");
  await drawer.getByRole("button", { name: "Increase quantity" }).click();
  await expect(drawer).toContainText("₱540 away from free shipping");
  await page.reload();
  await expect(page.getByRole("button", { name: "Open cart" })).toContainText("2");
});

test("free-shipping message appears at the threshold", async ({ page }) => {
  await page.goto("/product/mt-apo-natural");            // ₱650 x 3 = ₱1,950
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("dialog")).toContainText("You've unlocked free shipping");
});

test("corrupt or stale cart storage does not crash the site", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("bl-cart-v1", "{not json"));
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(() => localStorage.setItem("bl-cart-v1", JSON.stringify([
    { variantId: 987654, qty: 1, productName: "Ghost", variantName: "X", slug: "ghost", price: 100, image: null, stock: 3 },
  ])));
  await page.reload();
  await page.getByRole("button", { name: "Open cart" }).click();
  await expect(page.getByRole("dialog")).toContainText("Ghost — X is no longer available");
  await expect(page.getByRole("dialog")).toContainText("Your cart is empty");
});
```

- [ ] **Step 6: Build.** `CartProvider` (client) loads with `parseCart(localStorage.getItem(CART_KEY))` in an effect, sets `ready`, saves on every change, and wraps storage access in try/catch. `CartDrawer` uses shadcn `Sheet` (bottom sheet on mobile, right side from `md`); on open it calls `refreshCart(ids)`, applies `reconcile`, and shows `removed`/`reduced` notices ("… is no longer available", "… was reduced to the stock left"). `ShippingProgress` takes `subtotal` and `threshold` (passed from the server layout via `getSettings()`), renders a `<progress>`-style bar and either "₱X away from free shipping" or "You've unlocked free shipping". Steppers have `aria-label="Increase quantity"` / `"Decrease quantity"`. Checkout button is a link to `/checkout`, placed at the bottom of the sheet within thumb reach. Empty cart: "Your cart is empty" with a link to `/shop`. `PurchasePanel` calls `add()` then `open()`. Header badge shows `countOf(lines)` once `ready`.
- [ ] **Step 7: Run `npm run typecheck`, `npm test`, `npm run e2e`.** Expected: all pass.
- [ ] **Step 8: Commit.** `feat: localStorage cart with drawer and free-shipping progress`

---

### Task 10: Checkout and thank-you

**Files:**
- Create: `actions/checkout.ts`, `app/(store)/checkout/page.tsx`, `components/store/checkout-form.tsx`, `app/(store)/thank-you/[code]/page.tsx`, `components/store/clear-cart.tsx`, `app/api/locations/route.ts`, `e2e/checkout.spec.ts`

**Interfaces:**
- Consumes: `placeOrder`, `OrderInput`, `PlaceResult`, `getOrderByCode`, `provinces`, `citiesOf`, `regionGroupOf`, `shippingFee`, `getSettings`, `useCart`.
- Produces: `"use server"; export async function submitOrder(input: OrderInput): Promise<PlaceResult>` — calls `placeOrder(input)` and returns its result unchanged. `GET /api/locations?province=X` → `{ cities: string[] }` (keeps the 1,600-city list out of the client bundle).

Requirements:
- `/checkout` server page passes `provinces()`, a `groups: Record<province, RegionGroup>` map, and `getSettings()` to `<CheckoutForm>`.
- Form fields, each with a visible `<Label>`: Full name, Mobile number (`inputMode="numeric"`, `autoComplete="tel"`), Province (`<select>`), City / Municipality (`<select>`, disabled until a province is chosen, filled from `/api/locations`), Street address, Delivery notes (optional), Payment method radios "Cash on delivery" and "GCash".
- Choosing GCash reveals: "Send ₱{total} to {gcashNumber}, then enter the reference number below." and a required "GCash reference number" input. With COD selected the input is not in the DOM.
- Order summary: lines, subtotal, shipping ("Choose a province" until one is picked, "Free" when 0), total. Updates when the province changes.
- "Place order" button: full width, sticky at the bottom on mobile, `disabled` while the action is pending (`useTransition`) and after a success until navigation. On `{ ok: false }` show the error next to the named field (or above the summary for `lines`), and for `lines` errors re-run the cart refresh. On `{ ok: true }` `router.push("/thank-you/" + code)`.
- Cart not `ready`: render nothing. Cart ready and empty: `<EmptyState title="Your cart is empty" …/>`.
- `/thank-you/[code]`: `notFound()` if the code is unknown. Shows the code, items from snapshots, subtotal, shipping, total, and "What happens next": for COD — we confirm by text within a day, pack within 2 business days, pay the rider in cash; for GCash — we verify the reference within a day, then pack and ship. `<ClearCart />` (client) calls `clear()` on mount.

- [ ] **Step 1: Write failing `e2e/checkout.spec.ts`.**

```ts
import { expect, test, type Page } from "@playwright/test";

async function addAndCheckout(page: Page, slug: string, extraQty = 0) {
  await page.goto(`/product/${slug}`);
  for (let i = 0; i < extraQty; i++) await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("dialog").getByRole("link", { name: /checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout/);
}

async function fillContact(page: Page, province = "Metro Manila", city = "Quezon City") {
  await page.getByLabel("Full name").fill("Ana Reyes");
  await page.getByLabel("Mobile number").fill("09171234567");
  await page.getByLabel("Province").selectOption(province);
  await page.getByLabel("City / Municipality").selectOption(city);
  await page.getByLabel("Street address").fill("12 Mabini St");
}

test("COD order: no reference field, correct totals, thank-you page", async ({ page }) => {
  await addAndCheckout(page, "batangas-barako");            // ₱390
  await fillContact(page);
  await page.getByLabel("Cash on delivery").check();
  await expect(page.getByLabel("GCash reference number")).toHaveCount(0);
  await expect(page.getByTestId("summary")).toContainText("₱80");
  await expect(page.getByTestId("summary")).toContainText("₱470");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/thank-you\/BL-\d{4}-\d{4}/);
  await expect(page.getByText(/pay the rider/i)).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open cart" })).not.toContainText("1");
});

test("GCash order requires a reference", async ({ page }) => {
  await addAndCheckout(page, "wild-forest-honey");
  await fillContact(page, "Cebu", "Cebu City");
  await page.getByLabel("GCash").check();
  await expect(page.getByText(/0917 000 0000/)).toBeVisible();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Enter your GCash reference number.")).toBeVisible();
  await page.getByLabel("GCash reference number").fill("1234567890123");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/thank-you\//);
});

test("shipping is free in the summary at ₱1,500 or more", async ({ page }) => {
  await addAndCheckout(page, "coconut-sugar", 6);           // ₱240 x 7 = ₱1,680
  await fillContact(page, "Davao del Sur", "Davao City");
  await expect(page.getByTestId("summary")).toContainText("Free");
});

test("double tap on Place order creates one order", async ({ page }) => {
  await addAndCheckout(page, "negros-muscovado");
  await fillContact(page);
  await page.getByLabel("Cash on delivery").check();
  const button = page.getByRole("button", { name: "Place order" });
  await button.dblclick();
  await expect(page).toHaveURL(/\/thank-you\/(BL-\d{4}-\d{4})/);
  const code = page.url().split("/").pop()!;
  const n = Number(code.split("-")[2]);
  // the next number must not have been taken by a duplicate
  expect((await page.request.get(`/thank-you/BL-${code.split("-")[1]}-${String(n + 1).padStart(4, "0")}`)).status()).toBe(404);
});

test("empty cart at checkout shows an empty state", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});

test("unknown order code is a 404", async ({ page }) => {
  expect((await page.goto("/thank-you/BL-0000-0000"))!.status()).toBe(404);
});
```

Adjust the city option labels to the data file's spelling if they differ.

- [ ] **Step 2: Run, expect FAIL. Step 3: Build to the requirements; wrap the summary in `data-testid="summary"`. Step 4: Run `npm run typecheck`, `npm run lint`, `npm run e2e`; expect PASS.**
- [ ] **Step 5: Commit.** `feat: one-page checkout with COD/GCash and thank-you page`

---

### Task 11: Admin auth

**Files:**
- Create: `lib/auth.ts`, `tests/auth.test.ts`, `middleware.ts`, `actions/auth.ts`, `app/admin/login/page.tsx`, `components/admin/login-form.tsx`, `app/admin/(console)/layout.tsx`, `app/admin/(console)/page.tsx` (temporary heading only), `e2e/admin-auth.spec.ts`

**Interfaces:**
- Produces:

```ts
// lib/auth.ts — Web Crypto only, so it runs in middleware and in server actions
export const SESSION_COOKIE = "bl_admin";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
createSession(password: string, now?: number): Promise<string>            // `${expiresAtMs}.${hexHmac}`
verifySession(token: string | undefined, password: string | undefined, now?: number): Promise<boolean>
passwordMatches(input: string, password: string | undefined): Promise<boolean>
// actions/auth.ts
login(_: unknown, formData: FormData): Promise<{ error: string } | never>  // redirects to /admin on success
logout(): Promise<never>
requireAdmin(): Promise<void>   // throws redirect("/admin/login") when the cookie is invalid; every admin action calls it first
```

- [ ] **Step 1: Write failing `tests/auth.test.ts`.**

```ts
import { expect, test } from "vitest";
import { createSession, passwordMatches, SESSION_TTL_MS, verifySession } from "@/lib/auth";

const T0 = 1_800_000_000_000;

test("a fresh session verifies with the same password", async () => {
  expect(await verifySession(await createSession("secret", T0), "secret", T0 + 1000)).toBe(true);
});

test("expired, tampered, wrong-password and malformed tokens fail", async () => {
  const token = await createSession("secret", T0);
  const [exp, sig] = token.split(".");
  expect(await verifySession(token, "secret", T0 + SESSION_TTL_MS + 1)).toBe(false);
  expect(await verifySession(`${Number(exp) + 99999}.${sig}`, "secret", T0)).toBe(false);
  expect(await verifySession(token, "other", T0)).toBe(false);
  for (const bad of [undefined, "", "abc", "1.2.3", `${exp}.zz`]) expect(await verifySession(bad, "secret", T0)).toBe(false);
});

test("an unset or empty ADMIN_PASSWORD never authenticates", async () => {
  const token = await createSession("", T0);
  expect(await verifySession(token, "", T0)).toBe(false);
  expect(await verifySession(token, undefined, T0)).toBe(false);
  expect(await passwordMatches("", "")).toBe(false);
  expect(await passwordMatches("x", undefined)).toBe(false);
});

test("passwordMatches", async () => {
  expect(await passwordMatches("secret", "secret")).toBe(true);
  expect(await passwordMatches("Secret", "secret")).toBe(false);
});
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement `lib/auth.ts`.**

```ts
export const SESSION_COOKIE = "bl_admin";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const enc = new TextEncoder();

async function hmacHex(key: string, message: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compares without leaking where the strings differ. */
function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSession(password: string, now: number = Date.now()): Promise<string> {
  const exp = String(now + SESSION_TTL_MS);
  return `${exp}.${await hmacHex(password, "admin-session:" + exp)}`;
}

export async function verifySession(token: string | undefined, password: string | undefined, now: number = Date.now()): Promise<boolean> {
  if (!token || !password) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^\d+$/.test(parts[0])) return false;
  if (Number(parts[0]) <= now) return false;
  return sameString(parts[1], await hmacHex(password, "admin-session:" + parts[0]));
}

export async function passwordMatches(input: string, password: string | undefined): Promise<boolean> {
  if (!password) return false;
  // HMAC both sides so the comparison is over equal-length digests.
  return sameString(await hmacHex(password, "login:" + input), await hmacHex(password, "login:" + password));
}
```

- [ ] **Step 4: Run `npm test`, expect PASS.**

- [ ] **Step 5: Write `middleware.ts`.**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export const config = { matcher: ["/admin/:path*"] };

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();
  const ok = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, process.env.ADMIN_PASSWORD);
  return ok ? NextResponse.next() : NextResponse.redirect(new URL("/admin/login", req.url));
}
```

- [ ] **Step 6: Write `actions/auth.ts`.** `login` reads `password` from the form; on mismatch returns `{ error: "Wrong password." }`; on match sets the cookie (`httpOnly: true`, `sameSite: "lax"`, `secure: process.env.NODE_ENV === "production" && !process.env.INSECURE_COOKIES`, `path: "/"`, `maxAge: SESSION_TTL_MS / 1000`) and `redirect("/admin")`. `logout` deletes the cookie and redirects to `/admin/login`. `requireAdmin` verifies the cookie from `await cookies()`. The e2e servers run `next start` over http, so add `INSECURE_COOKIES: "1"` to both `webServer.env` blocks in `playwright.config.ts`. Login form: one password input labelled "Password", a "Sign in" button, error text from `useActionState`. Console layout: nav links Dashboard, Orders, Products, Settings, a "View store" link and a "Sign out" form button; `dynamic = "force-dynamic"`.

- [ ] **Step 7: Write `e2e/admin-auth.spec.ts` and a shared helper `e2e/admin.ts`.**

```ts
// e2e/admin.ts
import type { Page } from "@playwright/test";
export async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill("e2e-admin-pass");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/admin");
}
```

```ts
// e2e/admin-auth.spec.ts
import { expect, test } from "@playwright/test";
import { signIn } from "./admin";

test("admin pages redirect to login when signed out", async ({ page }) => {
  for (const url of ["/admin", "/admin/orders", "/admin/products", "/admin/settings"]) {
    await page.goto(url);
    await expect(page).toHaveURL(/\/admin\/login$/);
  }
});

test("wrong password is refused, right password signs in, sign out works", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill("nope");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Wrong password.")).toBeVisible();
  await signIn(page);
  await expect(page.getByRole("link", { name: "Orders" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});
```

- [ ] **Step 8: Run `npm run e2e`, expect PASS. Commit.** `feat: admin login with HMAC session cookie and route guard`

---

### Task 12: Admin dashboard and orders

**Files:**
- Create: `actions/orders.ts`, `app/admin/(console)/page.tsx` (replace), `app/admin/(console)/orders/page.tsx`, `app/admin/(console)/orders/[id]/page.tsx`, `components/admin/{stat-card,status-badge,order-status-buttons,admin-notes-form}.tsx`, `e2e/admin-orders.spec.ts`
- Modify: `e2e/empty.spec.ts`

**Interfaces:**
- Consumes: `dashboardStats`, `lowStockVariants`, `listOrders`, `getOrder`, `nextStatuses`, `changeStatus`, `setAdminNotes`, `requireAdmin`, `formatPeso`, `formatManila`.
- Produces: `"use server"` actions `moveOrder(id: number, to: OrderStatus): Promise<{ ok: true } | { ok: false; error: string }>` and `saveAdminNotes(id: number, notes: string): Promise<void>`; both call `requireAdmin()` first and `revalidatePath("/admin", "layout")` after.

Requirements:
- Dashboard: four stat cards — "Orders today", "Revenue today", "Pending", "Low stock" — then a table of today's orders and a list of low-stock variants linking to the product edit page. Empty states: "No orders yet today" and "Stock levels look healthy".
- Orders list: columns Code, Date (Manila), Customer, Total, Payment, Status; status filter as links (`/admin/orders?status=new`); the whole row links to the detail page. On mobile render each order as a stacked card instead of a table row. Empty: "No orders yet".
- Order detail: items with qty × price snapshot, subtotal, shipping, total; customer name, mobile as a `tel:` link, full address, delivery notes; payment method and, for GCash, "GCash ref: …"; one button per entry of `nextStatuses(status)` labelled "Mark confirmed", "Mark shipped", "Mark delivered", "Cancel order"; cancel asks for confirmation in a dialog saying stock will be returned; internal notes textarea with "Save notes". `notFound()` for unknown ids. Action errors show in a toast.

- [ ] **Step 1: Write failing `e2e/admin-orders.spec.ts`.**

```ts
import { expect, test } from "@playwright/test";
import { signIn } from "./admin";

test("a storefront order appears as new with correct totals, then cancel restores stock", async ({ page }) => {
  // stock before
  await page.goto("/product/cacao-husk-tea");               // ₱280, Original stock 25 in seed
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("dialog").getByRole("link", { name: /checkout/i }).click();
  await page.getByLabel("Full name").fill("Carlo Dizon");
  await page.getByLabel("Mobile number").fill("09181112222");
  await page.getByLabel("Province").selectOption("Benguet");
  await page.getByLabel("City / Municipality").selectOption("Baguio City");
  await page.getByLabel("Street address").fill("5 Session Rd");
  await page.getByLabel("GCash").check();
  await page.getByLabel("GCash reference number").fill("9988776655443");
  await page.getByRole("button", { name: "Place order" }).click();
  await page.waitForURL(/\/thank-you\//);
  const code = page.url().split("/").pop()!;

  await signIn(page);
  await page.goto("/admin/orders?status=new");
  const row = page.getByRole("link", { name: new RegExp(code) });
  await expect(row).toContainText("Carlo Dizon");
  await expect(row).toContainText("₱400");                  // 280 + 120 Luzon
  await row.click();
  await expect(page.getByText("GCash ref: 9988776655443")).toBeVisible();
  await expect(page.getByText("Cacao Husk Tea — Original")).toBeVisible();

  await page.getByLabel("Internal notes").fill("Verified payment");
  await page.getByRole("button", { name: "Save notes" }).click();
  await page.reload();
  await expect(page.getByLabel("Internal notes")).toHaveValue("Verified payment");

  await page.getByRole("button", { name: "Mark confirmed" }).click();
  await expect(page.getByTestId("status")).toHaveText(/confirmed/i);
  await expect(page.getByRole("button", { name: "Mark delivered" })).toHaveCount(0);

  await page.getByRole("button", { name: "Cancel order" }).click();
  await page.getByRole("button", { name: "Yes, cancel and restock" }).click();
  await expect(page.getByTestId("status")).toHaveText(/cancelled/i);
  await expect(page.getByRole("button", { name: /mark|cancel order/i })).toHaveCount(0);
});

test("dashboard shows the four stats", async ({ page }) => {
  await signIn(page);
  for (const label of ["Orders today", "Revenue today", "Pending", "Low stock"])
    await expect(page.getByText(label)).toBeVisible();
});
```

Add to `e2e/empty.spec.ts`:

```ts
test("admin on an unseeded database shows empty states", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill("e2e-admin-pass");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("No orders yet today")).toBeVisible();
  await page.goto("/admin/orders");
  await expect(page.getByText("No orders yet")).toBeVisible();
  await page.goto("/admin/products");
  await expect(page.getByText("No products yet")).toBeVisible();
});
```

(The products line passes after Task 13; until then mark that test `test.fixme` and remove the mark in Task 13.)

- [ ] **Step 2: Run, expect FAIL. Step 3: Build to the requirements; put `data-testid="status"` on the detail page's status badge. Step 4: Run all checks, expect PASS.**
- [ ] **Step 5: Commit.** `feat: admin dashboard, orders table and order detail`

---

### Task 13: Products CRUD

**Files:**
- Create: `actions/products.ts`, `app/admin/(console)/products/page.tsx`, `products/new/page.tsx`, `products/[id]/page.tsx`, `components/admin/product-form.tsx`, `components/admin/variants-editor.tsx`, `lib/product-form.ts`, `tests/product-form.test.ts`, `e2e/z-admin-products.spec.ts`

**Interfaces:**
- Consumes: `createProduct`, `updateProduct`, `removeProduct`, `getProductById`, `listProducts`, `ProductInput`, `SaveResult`, `parsePeso`, `requireAdmin`.
- Produces:

```ts
// lib/product-form.ts
export type ProductFormValues = {
  name: string; slug: string; category: string; description: string; howToUse: string;
  price: string; compareAt: string; images: string;   // images: one URL per line
  featured: boolean; active: boolean;
  variants: { id?: number; name: string; sku: string; stock: string }[];
};
toProductInput(v: ProductFormValues): { ok: true; input: ProductInput } | { ok: false; field: string; error: string }
slugify(name: string): string
// actions/products.ts
saveProduct(id: number | null, v: ProductFormValues): Promise<SaveResult>
deleteProduct(id: number): Promise<"deleted" | "deactivated">
```

`toProductInput` rules: price via `parsePeso` (null → field `price`, "Enter a price like 450 or 1,299.50."); compare-at blank → null, otherwise `parsePeso` (null → field `compareAt`); stock must match `/^\d+$/` (else field `variants`, "Stock must be a whole number, 0 or more."); image lines are trimmed, blanks dropped, each must start with `https://` (else field `images`).

- [ ] **Step 1: Write failing `tests/product-form.test.ts`.**

```ts
import { expect, test } from "vitest";
import { slugify, toProductInput, type ProductFormValues } from "@/lib/product-form";

const form = (over: Partial<ProductFormValues> = {}): ProductFormValues => ({
  name: "Wild Honey", slug: "wild-honey", category: "Pantry", description: "", howToUse: "",
  price: "1,299.50", compareAt: "", images: "https://images.unsplash.com/a\n\n https://images.unsplash.com/b ",
  featured: false, active: true, variants: [{ name: "250ml", sku: "", stock: "12" }], ...over,
});

test("parses a valid form", () => {
  const r = toProductInput(form());
  expect(r).toMatchObject({ ok: true, input: { price: 129950, compareAt: null,
    images: ["https://images.unsplash.com/a", "https://images.unsplash.com/b"], variants: [{ name: "250ml", stock: 12 }] } });
});

test.each([
  [{ price: "" }, "price"], [{ price: "-5" }, "price"], [{ price: "abc" }, "price"],
  [{ compareAt: "x" }, "compareAt"], [{ images: "ftp://x" }, "images"],
  [{ variants: [{ name: "A", sku: "", stock: "1.5" }] }, "variants"],
  [{ variants: [{ name: "A", sku: "", stock: "-1" }] }, "variants"],
  [{ variants: [{ name: "A", sku: "", stock: "" }] }, "variants"],
])("rejects %j on %s", (over, field) => {
  expect(toProductInput(form(over as Partial<ProductFormValues>))).toMatchObject({ ok: false, field });
});

test("slugify", () => {
  expect(slugify("  Mt. Apo Natural (500g)! ")).toBe("mt-apo-natural-500g");
});
```

- [ ] **Step 2: Run, expect FAIL. Step 3: Implement `lib/product-form.ts`. Step 4: Run, expect PASS.**

- [ ] **Step 5: Write failing `e2e/z-admin-products.spec.ts`.**

```ts
import { expect, test } from "@playwright/test";
import { signIn } from "./admin";

test("create, see on storefront, edit, deactivate", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products");
  await page.getByRole("link", { name: "New product" }).click();
  await page.getByLabel("Name").fill("Kapeng Test");
  await expect(page.getByLabel("Slug")).toHaveValue("kapeng-test");
  await page.getByLabel("Category").fill("Coffee");
  await page.getByLabel("Price").fill("abc");
  await page.getByLabel("Variant 1 name").fill("250g");
  await page.getByLabel("Variant 1 stock").fill("3");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText("Enter a price like 450 or 1,299.50.")).toBeVisible();
  await page.getByLabel("Price").fill("1,250");
  await page.getByLabel("Compare-at price").fill("1,500");
  await page.getByRole("button", { name: "Add variant" }).click();
  await page.getByLabel("Variant 2 name").fill("500g");
  await page.getByLabel("Variant 2 stock").fill("0");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);

  await page.goto("/product/kapeng-test");
  await expect(page.getByText("₱1,250")).toBeVisible();
  await expect(page.locator("s")).toContainText("₱1,500");
  await expect(page.getByRole("radio", { name: /500g/ })).toBeDisabled();

  await page.goto("/admin/products");
  await page.getByRole("link", { name: /Kapeng Test/ }).click();
  await page.getByLabel("Active").uncheck();
  await page.getByRole("button", { name: "Save product" }).click();
  expect((await page.goto("/product/kapeng-test"))!.status()).toBe(404);
});

test("duplicate slug shows a field error", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products/new");
  await page.getByLabel("Name").fill("Copy");
  await page.getByLabel("Slug").fill("benguet-arabica");
  await page.getByLabel("Category").fill("Coffee");
  await page.getByLabel("Price").fill("100");
  await page.getByLabel("Variant 1 name").fill("A");
  await page.getByLabel("Variant 1 stock").fill("1");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText("That slug is already used by another product.")).toBeVisible();
});

test("deleting a product with orders deactivates it instead", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products");
  await page.getByRole("link", { name: /Benguet Arabica/ }).click();
  await page.getByRole("button", { name: "Delete product" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByText(/has past orders, so it was deactivated/i)).toBeVisible();
});
```

The `z-` prefix makes this spec run after the storefront specs, because it deactivates a seeded product they use.

- [ ] **Step 6: Build.** List page: image thumb, name, category, price, total stock, Featured/Inactive badges, "New product" link; empty state "No products yet". Form: labelled inputs matching the test labels (`Name`, `Slug`, `Category` with a `<datalist>` of existing categories, `Description`, `How to use`, `Price`, `Compare-at price`, `Image URLs (one per line)`, `Featured`, `Active`); slug auto-fills from name via `slugify` until the slug is edited by hand; variants editor rows labelled `Variant N name`, `Variant N SKU`, `Variant N stock`, with "Add variant" and per-row "Remove" (disabled when one row remains). Field errors render under the field named by `SaveResult.field`. On success `router.push("/admin/products")`. `saveProduct` calls `requireAdmin()`, `toProductInput`, then create or update, then `revalidatePath("/", "layout")`. Remove the `test.fixme` from Task 12's empty-admin test.
- [ ] **Step 7: Run all checks, expect PASS. Commit.** `feat: admin products CRUD with variants editor`

---

### Task 14: Settings

**Files:**
- Create: `actions/settings.ts`, `app/admin/(console)/settings/page.tsx`, `components/admin/settings-form.tsx`, `e2e/z-admin-settings.spec.ts`

**Interfaces:**
- Consumes: `getSettings`, `updateSettings`, `parsePeso`, `formatPeso`, `requireAdmin`.
- Produces: `saveSettings(v: { freeShippingThreshold: string; gcashNumber: string; feeNcr: string; feeLuzon: string; feeVismin: string }): Promise<{ ok: true } | { ok: false; field: string; error: string }>` — every money field through `parsePeso` (null → that field, "Enter an amount like 80 or 1,500."); `gcashNumber` must be non-empty after trim; then `updateSettings` and `revalidatePath("/", "layout")`.

- [ ] **Step 1: Write failing e2e.**

```ts
import { expect, test } from "@playwright/test";
import { signIn } from "./admin";

test("settings change the storefront", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/settings");
  await expect(page.getByLabel("Free-shipping threshold")).toHaveValue("1,500");
  await page.getByLabel("NCR shipping fee").fill("oops");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Enter an amount like 80 or 1,500.")).toBeVisible();
  await page.getByLabel("NCR shipping fee").fill("95");
  await page.getByLabel("Free-shipping threshold").fill("2,000");
  await page.getByLabel("GCash number").fill("0998 765 4321");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved")).toBeVisible();

  await page.goto("/product/sagada-dark-roast");            // ₱520
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("dialog")).toContainText("₱1,480 away from free shipping");
  await page.getByRole("dialog").getByRole("link", { name: /checkout/i }).click();
  await page.getByLabel("Province").selectOption("Metro Manila");
  await expect(page.getByTestId("summary")).toContainText("₱95");
  await page.getByLabel("GCash").check();
  await expect(page.getByText(/0998 765 4321/)).toBeVisible();
});
```

- [ ] **Step 2: Run, expect FAIL. Step 3: Build** (five labelled inputs: "Free-shipping threshold", "GCash number", "NCR shipping fee", "Luzon shipping fee", "Visayas / Mindanao shipping fee"; money inputs prefilled with the amount without the ₱ sign; success toast "Settings saved"). **Step 4: Run all checks, expect PASS.**
- [ ] **Step 5: Commit.** `feat: admin settings for shipping fees, threshold and GCash number`

---

### Task 15: Design pass

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`, all `components/store/*`, admin layout and tables as needed

No new behaviour; every existing test must still pass.

- [ ] **Step 1: Invoke the `ui-ux-pro-max:ui-ux-pro-max` skill** and choose a direction for a premium PH pantry brand: warm off-white background, deep green or cacao-brown primary, one accent; a display serif for headings with a clean sans for body, both loaded through `next/font` with `display: "swap"` (two families at most); generous whitespace; photography-led cards with consistent aspect ratios (4:5 product, 16:9 story band).
- [ ] **Step 2: Apply tokens** in `globals.css` (shadcn CSS variables) so admin and storefront share them. Remove every default-template look: no stock shadcn grey cards on the storefront, no centred-everything hero.
- [ ] **Step 3: Check each storefront page at 375px, 768px and 1280px** in the built-in browser against `npm run dev`. Fix: text contrast below 4.5:1, tap targets under 44px, layout shift from images without reserved space, focus rings missing on interactive elements, primary actions (Add to cart, Checkout, Place order) not reachable in the bottom half of a 375×812 screen.
- [ ] **Step 4: Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run e2e`.** Expected: all pass.
- [ ] **Step 5: Commit.** `style: brand design pass across storefront and admin`

---

### Task 16: Lighthouse pass and acceptance

**Files:**
- Modify: whatever the audit points at (usually `app/(store)/page.tsx`, `components/store/product-image.tsx`, `app/layout.tsx`)
- Create: `README.md` (replace scaffold README)

- [ ] **Step 1: Measure.** `npm run seed`, `npm run build`, start with `npm run start`, then run `npx lighthouse http://localhost:3010/ --only-categories=performance --form-factor=mobile --output=json --output-path=./lighthouse.json --chrome-flags="--headless"` three times and take the median score. Add `lighthouse.json` to `.gitignore`.
- [ ] **Step 2: If the median is below 90, fix in this order and re-measure after each:** hero image has `priority`, explicit `sizes="100vw"` and Unsplash `w` no larger than 1200; all other images lazy with accurate `sizes`; gallery and story images below the fold use `loading="lazy"`; cart drawer and its Sheet code loaded with `next/dynamic` so they are out of the initial bundle; no client component wraps server-renderable sections; fonts limited to the weights used; no layout shift (every image has an aspect-ratio box).
- [ ] **Step 3: Record the final three scores** in the commit message.
- [ ] **Step 4: Walk the acceptance checklist by hand at 375px** in the built-in browser against the production build, signing in with the `ADMIN_PASSWORD` from `.env.local` (create it from `.env.example` with a password of your choosing if missing): (1) add to cart → checkout → order shows as "new" in `/admin/orders` with correct totals; (2) stock drops on order and returns on cancel — check the product's variant stock in `/admin/products` before, after order, after cancel; (3) cart of exactly ₱1,500 shows free shipping at checkout, ₱1,499 or less does not; (4) GCash order stores the reference, COD shows no reference field; (5) whole flow is usable with one thumb; (6) stop the server, start it with `DB_PATH=data/blank.db`, and confirm `/`, `/shop`, `/admin` render empty states.
- [ ] **Step 5: Write `README.md`:** what it is, requirements (Node 24), setup (`npm install`, copy `.env.example` to `.env.local` and set `ADMIN_PASSWORD`, `npm run seed`, `npm run dev`), the commands table, the note that scripts call `node` directly because of the `&` in the folder name, and how to re-skin (`lib/brand.ts`, `lib/seed-data.ts`, CSS tokens).
- [ ] **Step 6: Final run of `npm run typecheck`, `npm run lint`, `npm test`, `npm run e2e`.** Expected: all pass.
- [ ] **Step 7: Commit.** `perf: Lighthouse pass on home; docs: README`
