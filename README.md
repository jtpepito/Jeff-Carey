# Jef&Carey storefront

An e-commerce starter for a Philippine direct-to-consumer brand: a mobile-first storefront and a
simple order console. Checkout takes cash on delivery or a GCash reference number. There is no card
gateway.

The brand is Jef&Carey, a small-batch bakery in Cebu. The menu, recipes and ingredient prices come from the owner's costing file; photos, stock levels and sample orders are placeholders. Everything brand-specific is in
three places, so the starter can be re-skinned:

- `lib/brand.ts` — name, order-code prefix, copy, FAQs
- `public/logo.jpg`, `public/logo-160.webp`, `app/icon.png`, `app/apple-icon.png` — the logo and browser icons
- `lib/seed-data.ts` — demo products and orders
- `app/globals.css` — colour tokens; `app/layout.tsx` — heading font

## Requirements

Node.js 24 or newer (the app uses the built-in `node:sqlite`). No database server, Docker or cloud
account is needed.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env.local` and set `ADMIN_PASSWORD`. Without it nobody can sign in to
`/admin`.

```bash
npm run seed
```

```bash
npm run dev
```

The store is at http://localhost:3010 and the console at http://localhost:3010/admin.

`npm run seed` wipes the database and loads 12 products and 15 orders. Skip it to start with an
empty shop; every page has an empty state.

## Deploying

The store runs on Fly.io (`fly.toml`, `Dockerfile`): one small machine in Singapore with a 1 GB volume at
`/data` holding `store.db`. Set the admin password once with `fly secrets set ADMIN_PASSWORD=...`, then:

```bash
fly deploy --app jef-carey --ha=false --remote-only --depot=false
```

A freshly deployed shop is empty; the admin dashboard offers a one-tap "Load the menu and sample data" button
that runs the seed once.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3010 |
| `npm run build` then `npm run start` | Production build and server on port 3010 |
| `npm run seed` | Reset `data/store.db` to the demo data |
| `npm test` | Unit tests (Vitest) for the business rules |
| `npm run e2e` | Builds, then runs the browser tests (Playwright) at 375px on ports 3218 and 3219 |
| `npm run typecheck` / `npm run lint` | Type and lint checks |

Stop any running dev or production server before `npm run build` or `npm run e2e`; they rewrite
`.next`.

## Things to know

- **The folder name contains `&`.** On Windows that breaks npm's `.cmd` shims, so every script in
  `package.json` calls `node <path-to-tool>` directly. Do the same for new scripts, and don't use
  `npx <local tool>` inside this folder.
- **Data** lives in `data/store.db` (git-ignored). Set `DB_PATH` to use a different file.
- **Money** is stored as integer centavos. Only `lib/money.ts` converts to and from ₱ text.
- **Dates**: timestamps are stored in UTC; "today" and order-code months use Asia/Manila.
- **Order codes** look like `JC-2610-0001`: prefix, year and month, then a counter that restarts
  each month.
- **Recipe costing**: `/admin/ingredients` holds the packs you buy (size and price). `/admin/components`
  holds shared sub-recipes (a dough, a filling, a topping) with a yield, costed per unit of that yield.
  Each product has a recipe under `/admin/products/<id>/recipe`: a base batch (yield in pieces,
  ingredient or component lines, labour minutes, default packaging per unit sold) plus, per option,
  the pieces per unit sold, a packaging override and extra batch lines. Cost per unit =
  (batch + option extras) ÷ yield × pieces + packaging. Suggested price = cost before packaging ×
  the "Target markup" setting + packaging, rounded up to the peso; "Use" on the product page applies it.
- **Option prices**: each product option can carry its own price; blank means the product price.
  The storefront shows "from ₱x" when options differ. The seed prices every option at its suggested
  price, except the cupcake, which keeps the owner's ₱100 / ₱400.
- **The menu, ingredient prices and recipes** come from the owner's `Recipe Costing File.xlsx`
  (cinnamon rolls in four flavours, vanilla cupcakes). The sweet-bread recipes in that file have no
  prices yet and were not imported.
- **Preferred date**: every order carries the day the customer wants it delivered or picked up, at least
  `MIN_LEAD_DAYS` (2) and at most `MAX_LEAD_DAYS` (60) days out, Manila time. Staff see it as "Wanted by".
- **Pickup-only mode**: `pickupOnly: true` in `lib/brand.ts` (the current setting). Checkout offers no delivery
  choice, address or fee, the cart drops its free-shipping bar, and settings hide the fee fields. Set it to
  false to bring delivery back.
- **Pickup**: shoppers can choose pickup at checkout (no address, no delivery fee). The pickup
  address and hours shown to them are the "Pickup details" field in `/admin/settings`.
- **Delivery area**: `deliveryProvinces` in `lib/brand.ts` (currently Cebu only; an empty list means
  nationwide). Checkout, the order rules and the settings page all follow it.
- **Shipping**: one fee per region group (Metro Manila, Luzon, Visayas/Mindanao), free at or above the
  free-shipping threshold. `/admin/settings` shows only the fees for regions in the delivery area.
- **Province and city list**: `data/ph-locations.json`, generated by
  `scripts/build-ph-locations.mjs` from the `philippines` npm package.
- **Images**: Unsplash URLs are resized by Next.js. Images from any other host are shown as-is.
- **Sessions**: the admin cookie is signed with `ADMIN_PASSWORD` and lasts 7 days. Changing the
  password signs everyone out.

## Where things are

- `lib/` — business rules with no React in them (orders, products, shipping, cart, auth). Start here.
- `actions/` — server actions, thin wrappers over `lib/`.
- `app/(store)/` — storefront pages. `app/admin/` — the order console.
- `tests/` — unit tests. `e2e/` — browser tests.
- `docs/superpowers/` — the design spec and implementation plan.
