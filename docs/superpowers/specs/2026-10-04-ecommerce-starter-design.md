# E-commerce starter for a PH D2C brand — design

Date: 2026-10-04
Status: awaiting review

## 1. Goal

A reusable storefront plus a simple order console for a Philippine
direct-to-consumer brand. Checkout collects orders paid by cash on delivery or
by GCash reference. There is no card gateway in v1.

Done means:

- every item in the acceptance checklist (section 12) passes, and
- `/` scores 90 or higher on Lighthouse mobile performance against a
  production build.

## 2. Stack

Fixed by the brief. Do not deviate.

- Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui.
- `node:sqlite` behind a singleton in `lib/db.ts`. No Docker, no cloud
  services, no payment SDK.
- Cart in `localStorage` on the client, hydrated into checkout.
- Admin auth: env `ADMIN_PASSWORD`, HMAC-signed cookie.
- Currency ₱. All "today" logic uses Asia/Manila.

Location: `C:\WWJ\Claude Coding\Jef&Carey`, its own git repository.

## 3. Demo brand

**Bukid Lane** — small-batch Philippine pantry goods. Order codes use the
prefix `BL-`.

| Category | Example products | Variant axis |
|---|---|---|
| Coffee | single-origin beans from Benguet, Sagada, Mt. Apo, Batangas barako | size (250g / 500g) |
| Tablea & Cacao | tablea discs, cacao nibs, drinking chocolate, cacao tea | flavor |
| Pantry | wild honey, coco sugar, muscovado, coconut vinegar | size |

All brand-specific text (name, prefix, promise, story, FAQs) lives in one
file, `lib/brand.ts`, so the starter can be re-skinned for another brand.

## 4. Architecture

Server components read SQLite directly. Every mutation is a server action.
Client components exist only where interaction needs them: cart drawer,
variant picker, checkout form, admin forms.

Storefront pages render dynamically on each request. SQLite reads are
sub-millisecond, and dynamic rendering means stock shown is never stale.

```
app/
  (store)/                 layout with header, cart drawer, footer
    page.tsx               /
    shop/page.tsx          /shop
    product/[slug]/page.tsx
    checkout/page.tsx
    thank-you/[code]/page.tsx
  admin/
    login/page.tsx
    (console)/             layout with admin nav
      page.tsx             dashboard
      orders/page.tsx, orders/[id]/page.tsx
      products/page.tsx, products/new/page.tsx, products/[id]/page.tsx
      settings/page.tsx
lib/
  db.ts                    singleton connection, schema creation
  brand.ts                 brand name, prefix, copy
  money.ts                 centavos <-> ₱ formatting
  time.ts                  Asia/Manila helpers
  ph-locations.ts          province -> cities, province -> region group
  shipping.ts              fee calculation
  settings.ts              typed get/set with defaults
  products.ts              product and variant queries, CRUD
  orders.ts                place, list, get, change status, cancel
  order-code.ts            BL-YYMM-NNNN generation
  auth.ts                  cookie sign/verify
  cart.ts                  client cart store (localStorage)
actions/                   server actions, thin wrappers over lib/
components/                storefront and admin components, ui/ from shadcn
scripts/seed.ts            seed command
middleware.ts              guards /admin
```

Each `lib/` module has one job and no dependency on React, so the core rules
are unit-testable without a browser.

## 5. Data model

Money is stored as integer centavos. Timestamps are UTC ISO strings.
Schema is created automatically the first time `lib/db.ts` opens the
database, so an unseeded database is valid and empty.

```
products     id, slug UNIQUE, name, category, description, how_to_use,
             price, compare_at NULL, images JSON, featured 0/1, active 0/1
variants     id, product_id FK, name, stock, sku
orders       id, code UNIQUE, customer_name, mobile, province, city, address,
             notes, admin_notes, payment_method CHECK IN ('cod','gcash'),
             gcash_ref NULL, shipping_fee, subtotal, total,
             status CHECK IN ('new','confirmed','shipped','delivered','cancelled'),
             created_at
order_items  id, order_id FK, product_id, variant_id, name_snapshot,
             price_snapshot, qty
settings     key PRIMARY KEY, value
```

Additions to the brief's model, and why:

- `orders.admin_notes` — the order detail page needs internal notes, and
  `notes` already holds the customer's delivery notes.
- `products.how_to_use` — feeds the "How to use" tab. The "Shipping" tab is
  shared brand copy from `lib/brand.ts`.

Price lives on the product; all variants of a product share it.

`name_snapshot` stores "Product name — Variant name". `order_items.product_id`
and `variant_id` are plain integers without a cascading foreign key, so order
history survives product changes.

Settings keys and defaults (used when a key is missing):

| Key | Default |
|---|---|
| `free_shipping_threshold` | 150000 (₱1,500) |
| `gcash_number` | `0917 000 0000` |
| `shipping_fee_ncr` | 8000 (₱80) |
| `shipping_fee_luzon` | 12000 (₱120) |
| `shipping_fee_vismin` | 16000 (₱160) |

The database file is `data/store.db` (git-ignored). Env `DB_PATH` overrides
it; tests use a temporary file per run.

## 6. Core rules

### Placing an order (`lib/orders.ts: placeOrder`)

Input: contact, address, notes, payment method, optional GCash reference, and
cart lines as `{ variantId, qty }` only. Prices sent by the client are
ignored.

Inside one `BEGIN IMMEDIATE` transaction:

1. Load each variant with its product. Reject if a product is inactive or
   missing.
2. For each line run
   `UPDATE variants SET stock = stock - :qty WHERE id = :id AND stock >= :qty`.
   If any update changes zero rows, roll back and return an error naming the
   item that ran out.
3. Compute subtotal from current database prices.
4. Compute the shipping fee (below) and total.
5. Generate the order code and insert the order with status `new`.
6. Insert order items with name and price snapshots.

Validation before the transaction: name required; mobile matches
`09XXXXXXXXX`; province and city are a valid pair from `ph-locations`;
address required; at least one line; each qty is an integer of 1 or more;
GCash reference required when the method is `gcash` and stored as `NULL`
when the method is `cod`.

### Shipping fee (`lib/shipping.ts`)

- The province maps to a region group: NCR, Luzon, or Vis-Min.
- Fee is the setting for that group.
- Fee is 0 when `subtotal >= free_shipping_threshold`. A subtotal of exactly
  ₱1,500 ships free.

### Order code (`lib/order-code.ts`)

`BL-YYMM-NNNN`, where `YYMM` is the Manila year and month and `NNNN` is a
counter that restarts each month. The next number is the highest existing
counter for that month plus one, read inside the order transaction.

### Status flow

- Forward only: new → confirmed → shipped → delivered.
- Cancel is allowed from new, confirmed, or shipped. It is final.
- Cancelling adds each item's qty back to its variant in the same
  transaction that sets the status. Because cancelled is final, restocking
  happens exactly once. A variant that no longer exists is skipped.
- Any other transition is rejected server-side.

### Snapshots

Order pages, admin and thank-you, read only from `order_items` snapshots.
Editing or deactivating a product never changes a past order.

### Product deletion

A product with order history is deactivated instead of deleted. A product
with no orders is deleted along with its variants. Removing a variant during
an edit is always allowed, since order items keep their snapshot.

## 7. Storefront

Mobile-first. Every page is designed at 375px first, then widened.

1. **`/`** — hero with one featured product and the brand promise;
   best-sellers row (featured products); three category tiles; brand story
   band; six-image gallery grid; footer with FAQs as an accordion.
2. **`/shop`** — product grid; category filter, sort (featured, price low to
   high, price high to low), and search by name. Filter state lives in the
   URL query string, so the page is server-rendered and shareable.
3. **`/product/[slug]`** — image gallery; price with compare-at
   strikethrough; variant picker with out-of-stock variants disabled and
   labelled "Sold out"; qty stepper capped at stock; add to cart; tabs
   (Details / How to use / Shipping); three related products from the same
   category. Inactive or unknown slugs return 404.
4. **Cart drawer** — line items, qty steppers, remove, free-shipping progress
   bar against the threshold setting, subtotal, checkout button. On open it
   calls a server action to refresh prices and stock for the cart's variant
   ids, and flags lines that are sold out or reduced.
5. **`/checkout`** — one page: contact (name, mobile), address (province
   dropdown, then city dropdown, then street address), delivery notes,
   payment radio (COD or GCash), order summary with shipping fee that
   updates when the province changes. Choosing GCash shows the GCash number
   and a required reference field. An empty cart shows a designed empty
   state with a link to `/shop`.
6. **`/thank-you/[code]`** — order code, items, totals, payment method, and
   a "what happens next" list that differs for COD and GCash. The cart is
   cleared on arrival.

Cart storage: `localStorage` key holding `{ variantId, qty }` plus a display
snapshot (name, price, image) so the drawer renders instantly before the
refresh returns.

Images use `next/image`. Unsplash hosts are allowed in `next.config.ts` and
served optimised; any other host entered in admin renders unoptimised rather
than failing. The hero image is prioritised; everything below the fold lazy
loads.

## 8. Admin console

`middleware.ts` redirects any `/admin` route except `/admin/login` to the
login page unless the cookie is valid. Server actions under admin verify the
cookie again.

- **Login** — password compared to `ADMIN_PASSWORD` in constant time. On
  success, sets an `httpOnly`, `sameSite=lax` cookie holding an expiry
  timestamp and its HMAC-SHA256 signature keyed by `ADMIN_PASSWORD`. Valid
  for 7 days. Changing the password invalidates all sessions. If
  `ADMIN_PASSWORD` is unset, login always fails.
- **`/admin`** — today's orders (Manila day), today's revenue (sum of totals,
  excluding cancelled), pending count (status `new`), low-stock variants
  (stock of 5 or fewer, active products only).
- **`/admin/orders`** — table with code, date, customer, total, payment,
  status; filter by status. Row opens the detail page: items, address,
  payment reference, status buttons for the allowed next steps, cancel
  button, internal notes.
- **`/admin/products`** — list, create, edit, delete or deactivate. Fields:
  name, slug, category, description, how to use, price, compare-at, image
  URLs, featured, active, and a variants editor (name, SKU, stock per
  variant). Slug uniqueness is checked with a clear error.
- **`/admin/settings`** — free-shipping threshold, GCash number, three
  shipping fees.

## 9. Empty and error states

- Unseeded database: `/` shows the brand hero and a "products coming soon"
  panel; `/shop` shows an empty state; admin dashboard and tables show
  designed empty states. Nothing throws.
- Stock runs out between cart and checkout: the order is rejected with a
  message naming the item, and the cart is refreshed.
- Unknown order code on thank-you, unknown order or product in admin: 404.

## 10. Seed data

`npm run seed` wipes and fills the database with:

- 12 products across the 3 categories, with real-looking copy, Unsplash
  image URLs, 2–3 variants each with stock, some with compare-at prices,
  four featured. At least one variant has zero stock and two are low.
- 15 historical orders across the past 60 days in mixed statuses, both
  payment methods, with correct totals and codes.
- Default settings.

## 11. Testing

- **Unit (Vitest), against a temporary database:** placing an order
  decrements stock; insufficient stock rolls back everything; client prices
  are ignored; snapshots survive a product edit; shipping fee per region
  group; free shipping at exactly ₱1,500 and not at ₱1,499.99; cancel
  restocks once; invalid status transitions are rejected; order code format
  and monthly restart; GCash reference required for GCash and null for COD;
  auth cookie sign and verify, including expiry and tampering.
- **End-to-end (Playwright, 375px viewport):** add to cart → checkout →
  thank-you → order appears in `/admin/orders` as "new" with correct totals,
  once with COD and once with GCash; cancel restores stock; unseeded
  database renders empty states.
- **Lighthouse:** mobile run against `next build && next start` on `/`,
  target 90 or higher for performance.

## 12. Acceptance checklist

- [ ] Add to cart → checkout → order appears in `/admin/orders` as "new"
      with correct totals
- [ ] Stock decrements on order, restores on cancel
- [ ] Free shipping kicks in at exactly ₱1,500
- [ ] GCash order stores the reference; COD doesn't ask for one
- [ ] Mobile: whole purchase flow works one-handed at 375px
- [ ] Empty DB shows a designed empty state, not a crash

## 13. Build order

1. db + seed
2. storefront pages
3. cart + checkout + thank-you
4. admin auth + orders
5. products CRUD
6. settings
7. design pass (premium, not template-like)
8. Lighthouse pass

## 14. Non-goals (v1)

Card payments, customer accounts, vouchers, inventory sync, courier APIs,
emails.
