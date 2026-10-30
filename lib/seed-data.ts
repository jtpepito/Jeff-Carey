import { getDb } from "./db";
import { changeStatus, getOrderByCode, placeOrder, type OrderStatus } from "./orders";
import { createProduct, listProducts, type ProductInput } from "./products";
import { manilaDate } from "./time";
import { pickupOnly } from "./fulfilment";
import { applySuggestedPrice, saveComponent, saveIngredient, saveRecipe } from "./recipes";

// Ingredient prices, recipes and packaging come from the owner's "Recipe Costing File.xlsx" (Oct 2026).
// Photos are Unsplash stand-ins. Stock levels are placeholders.

const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;
const peso = (n: number) => Math.round(n * 100);

type SeedVariant = [name: string, stock: number, sku: string, pieces: number, packagingPesos: number];
type SeedProduct = Omit<ProductInput, "active" | "price" | "compareAt" | "images" | "variants"> & {
  photos: string[]; variants: SeedVariant[];
  recipe: { yield: number; labour: number; packaging: number; notes: string; items: [name: string, qty: number][] };
  /** Prices the owner set, in pesos per option; options without one get the suggested price. */
  prices?: Record<string, number>;
};

const ROLL_PHOTOS = ["1509365465985-25d11c17e812", "1483695028939-5bb13f8648b0"]; // Unsplash stand-ins (Oreo only)
const ROLL_NOTES = "Dough proofs overnight. One batch is 42 rolls. Box of 4 and Box of 9 use the gold PF boxes with sticker and ribbon; the tray uses the WB130 foil pan.";
// Packaging per unit sold, from the costing file: 7x7x4 box ₱28, 10x10x4 box ₱32, foil pan ₱13, sticker ₱2, ribbon ₱10.
const ROLL_VARIANTS: SeedVariant[] = [["Box of 4", 20, "", 4, 40], ["Box of 9", 10, "", 9, 44], ["Tray of 36", 3, "", 36, 15]];

const PRODUCTS: SeedProduct[] = [
  {
    slug: "og-cinnamon-rolls", name: "OG Cinnamon Rolls", category: "Cinnamon Rolls", featured: true,
    description: "Our original: soft, pull-apart rolls with a brown sugar and cinnamon swirl, topped with cream cheese frosting.",
    howToUse: "Best warm. 15 seconds in the microwave, or 5 minutes in a 160°C oven. Keeps 3 days at room temperature.",
    photos: ["/products/original.jpg", "/products/cover-1.jpg"], variants: ROLL_VARIANTS,
    recipe: { yield: 42, labour: 0, packaging: 40, notes: ROLL_NOTES, items: [["Cinnamon roll dough", 42], ["OG filling", 42], ["Cream cheese topping", 42]] },
  },
  {
    slug: "choco-cinnamon-rolls", name: "Choco Cinnamon Rolls", category: "Cinnamon Rolls", featured: true,
    description: "The cinnamon swirl gets cocoa in the filling, then cream cheese frosting and a dark chocolate drizzle on top.",
    howToUse: "Best warm. 15 seconds in the microwave, or 5 minutes in a 160°C oven. Keeps 3 days at room temperature.",
    photos: ["/products/chocolate-2.jpg", "/products/cover-1.jpg"], variants: ROLL_VARIANTS,
    recipe: { yield: 42, labour: 0, packaging: 40, notes: ROLL_NOTES, items: [["Cinnamon roll dough", 42], ["Choco filling", 42], ["Cream cheese topping", 42], ["Chocolate topping", 42]] },
  },
  {
    slug: "biscoff-cinnamon-rolls", name: "Biscoff Cinnamon Rolls", category: "Cinnamon Rolls", featured: false,
    description: "The original roll finished with cream cheese frosting and a layer of Biscoff on top.",
    howToUse: "Best warm. 15 seconds in the microwave, or 5 minutes in a 160°C oven. Keeps 3 days at room temperature.",
    photos: ["/products/biscoff-2.jpg", "/products/cover-2.jpg"], variants: ROLL_VARIANTS,
    recipe: { yield: 42, labour: 0, packaging: 40, notes: ROLL_NOTES, items: [["Cinnamon roll dough", 42], ["OG filling", 42], ["Cream cheese topping", 42], ["Biscoff spread", 210]] },
  },
  {
    slug: "oreo-cinnamon-rolls", name: "Oreo Cinnamon Rolls", category: "Cinnamon Rolls", featured: false,
    description: "Cocoa in the swirl, cream cheese frosting, and Oreo crumbs over the top.",
    howToUse: "Best warm. 15 seconds in the microwave, or 5 minutes in a 160°C oven. Keeps 3 days at room temperature.",
    photos: ROLL_PHOTOS, variants: [["Box of 4", 20, "", 4, 40], ["Box of 9", 10, "", 9, 44], ["Tray of 36", 0, "", 36, 15]],
    recipe: { yield: 42, labour: 0, packaging: 40, notes: ROLL_NOTES, items: [["Cinnamon roll dough", 42], ["Choco filling", 42], ["Cream cheese topping", 42], ["Oreo crumbs", 210]] },
  },
  {
    slug: "vanilla-cupcake", name: "Vanilla Cupcake", category: "Cupcakes", featured: true,
    description: "A 3 oz vanilla cupcake with a tall swirl of whipped cream frosting and sprinkles, boxed with a holder.",
    howToUse: "Keep chilled and let it sit out for 15 minutes before eating. Best within 3 days.",
    photos: ["1519869325930-281384150729", "1486427944299-d1955d23e34d"],
    // Per cupcake: liner ₱0.92, piping bag ₱0.71, sauce cup ₱1.82, a quarter of the ₱23 box, a quarter of the ₱4 holder, card ₱1.50.
    variants: [["Single", 40, "", 1, 11.7], ["Box of 4", 12, "", 4, 42.3]],
    prices: { Single: 100, "Box of 4": 400 },
    recipe: {
      yield: 16, labour: 0, packaging: 11.7,
      notes: "Yield 16 cupcakes at 3 oz. Sour cream: half a cup of all-purpose cream with 2 tbsp calamansi juice and 2 tbsp milk also works. Frosting is 45 g whipped cream and 5 g sprinkles per cupcake.",
      items: [
        ["All-purpose flour", 213], ["Sugar", 200], ["Baking soda", 1.5], ["Baking powder", 6], ["Salt", 1.42],
        ["Butter (Maven 225 g)", 170], ["Egg", 3], ["Vanilla extract", 15], ["Sour cream", 120], ["Whole milk", 120],
        ["Whip cream frosting", 720], ["Non-pareil sprinkles", 80],
      ],
    },
  },
];

// The pack you buy: [name, unit, pack size, pack price in pesos]. Prices as listed in the costing file.
const INGREDIENTS: [string, string, number, number][] = [
  ["All-purpose flour", "g", 1000, 57], ["Bread flour", "g", 1000, 51], ["Salt", "g", 1000, 24], ["Nutmeg", "g", 100, 0],
  ["Yeast", "g", 500, 283], ["Sugar", "g", 1000, 81], ["Fresh milk", "g", 1000, 93], ["Water", "g", 1000, 10], ["Egg", "pc", 1, 9],
  ["Butter (Caeli 2.5 kg)", "g", 2500, 1155], ["Brown sugar", "g", 1000, 63], ["Cinnamon powder", "g", 1000, 1208],
  ["Cocoa powder", "g", 1000, 850], ["Cream cheese", "g", 1360, 805], ["Confectioners sugar", "g", 2000, 238],
  ["Vanilla (Neco 3.3 kg)", "g", 3300, 262], ["Dark couverture", "g", 2500, 3990], ["All-purpose cream", "g", 1000, 328],
  ["Biscoff spread", "g", 1000, 985], ["Speculoos crumbs", "g", 1000, 615], ["Oreo crumbs", "g", 454, 208],
  ["Baking soda", "g", 1000, 43], ["Baking powder", "g", 1000, 109], ["Butter (Maven 225 g)", "g", 225, 165],
  ["Vanilla extract", "ml", 250, 57], ["Sour cream", "ml", 1000, 288], ["Whole milk", "ml", 1000, 85],
  ["Whip cream frosting", "g", 1500, 289], ["Non-pareil sprinkles", "g", 1000, 322],
  ["Cupcake liner", "pc", 100, 92], ["Piping bag", "pc", 100, 71], ["Sauce cup", "pc", 100, 182.4],
  ["6x6x3 red box", "pc", 5, 115], ["4-pc cupcake holder", "pc", 1, 4], ["7x7x4 gold box", "pc", 5, 140],
  ["10x10x4 gold box", "pc", 1, 32], ["Foil pan WB130", "pc", 10, 130],
];

// Sub-recipes shared by the cinnamon roll flavours. Each batch dresses 42 rolls.
const COMPONENTS: { name: string; yieldQty: number; yieldUnit: string; notes: string; items: [string, number][] }[] = [
  { name: "Cinnamon roll dough", yieldQty: 42, yieldUnit: "pc", notes: "Makes 42 rolls.",
    items: [["All-purpose flour", 500], ["Bread flour", 500], ["Salt", 15], ["Nutmeg", 10], ["Yeast", 20], ["Sugar", 200], ["Fresh milk", 400], ["Water", 100], ["Egg", 2], ["Butter (Caeli 2.5 kg)", 100]] },
  { name: "OG filling", yieldQty: 42, yieldUnit: "pc", notes: "", items: [["Butter (Caeli 2.5 kg)", 100], ["Brown sugar", 300], ["Cinnamon powder", 40]] },
  { name: "Choco filling", yieldQty: 42, yieldUnit: "pc", notes: "", items: [["Butter (Caeli 2.5 kg)", 100], ["Brown sugar", 300], ["Cinnamon powder", 40], ["Cocoa powder", 40]] },
  { name: "Cream cheese topping", yieldQty: 42, yieldUnit: "pc", notes: "", items: [["Cream cheese", 115], ["Butter (Caeli 2.5 kg)", 28], ["Confectioners sugar", 120], ["Vanilla (Neco 3.3 kg)", 15], ["Fresh milk", 65]] },
  { name: "Chocolate topping", yieldQty: 42, yieldUnit: "pc", notes: "", items: [["Dark couverture", 80], ["All-purpose cream", 20], ["Fresh milk", 40]] },
];

type SeedOrder = {
  daysAgo: number; name: string; mobile: string; city: string; address: string;
  notes?: string; gcashRef?: string; pickup?: boolean; status: OrderStatus; items: [slug: string, variant: string, qty: number][];
};

const ORDERS: SeedOrder[] = [
  { daysAgo: 59, name: "Maria Santos", mobile: "09171230001", city: "Cebu City", address: "45 Gorordo Ave, Lahug", status: "delivered", items: [["og-cinnamon-rolls", "Box of 4", 2], ["vanilla-cupcake", "Box of 4", 1]] },
  { daysAgo: 53, name: "Jose Ramirez", mobile: "09181230002", city: "Cebu City", address: "Unit 3B, 12 Escario St, Kamputhaw", gcashRef: "4012887766541", status: "delivered", items: [["choco-cinnamon-rolls", "Box of 9", 1]] },
  { daysAgo: 47, name: "Liza Bautista", mobile: "09191230003", city: "Mandaue City", address: "8 A. Del Rosario St, Guizo", pickup: true, status: "delivered", items: [["oreo-cinnamon-rolls", "Box of 4", 1]] },
  { daysAgo: 41, name: "Paolo Mendoza", mobile: "09271230004", city: "Talisay City", address: "Blk 4 Lot 9, Bulacao Heights", notes: "Leave with the guard if no one answers.", gcashRef: "5013996654120", status: "delivered", items: [["biscoff-cinnamon-rolls", "Box of 4", 2], ["vanilla-cupcake", "Single", 4]] },
  { daysAgo: 34, name: "Carmela Dizon", mobile: "09061230005", city: "Lapu-Lapu City", address: "27 M.L. Quezon National Hwy, Pusok", status: "cancelled", items: [["og-cinnamon-rolls", "Tray of 36", 1]] },
  { daysAgo: 28, name: "Ramon Villanueva", mobile: "09151230006", city: "Cebu City", address: "1803 Tower B, Cebu IT Park, Apas", gcashRef: "6014115543209", status: "shipped", items: [["choco-cinnamon-rolls", "Box of 4", 1], ["vanilla-cupcake", "Box of 4", 2]] },
  { daysAgo: 23, name: "Grace Lim", mobile: "09171230007", city: "Mandaue City", address: "16 Hernan Cortes St, Banilad", pickup: true, status: "shipped", items: [["og-cinnamon-rolls", "Box of 9", 1]] },
  { daysAgo: 19, name: "Antonio Cruz", mobile: "09281230008", city: "Consolacion", address: "5 Purok 2, Cansaga", status: "cancelled", items: [["vanilla-cupcake", "Single", 6]] },
  { daysAgo: 15, name: "Bea Fernandez", mobile: "09391230009", city: "Minglanilla", address: "214 Purok 3, Tunghaan", gcashRef: "7015224432108", status: "shipped", items: [["oreo-cinnamon-rolls", "Box of 9", 1], ["og-cinnamon-rolls", "Box of 4", 1]] },
  { daysAgo: 12, name: "Miguel Torres", mobile: "09171230010", city: "Liloan", address: "Km 18, Yati", status: "confirmed", items: [["biscoff-cinnamon-rolls", "Box of 9", 1]] },
  { daysAgo: 8, name: "Katrina Reyes", mobile: "09181230011", city: "Cebu City", address: "Unit 12F, 7 Salinas Dr, Lahug", gcashRef: "8016333321007", status: "confirmed", items: [["choco-cinnamon-rolls", "Tray of 36", 1]] },
  { daysAgo: 5, name: "Noel Aquino", mobile: "09061230012", city: "Danao City", address: "19 Rizal St, Poblacion", status: "confirmed", items: [["vanilla-cupcake", "Box of 4", 1], ["og-cinnamon-rolls", "Box of 4", 1]] },
  { daysAgo: 3, name: "Isabel Garcia", mobile: "09191230013", city: "Cebu City", address: "730 Sikatuna St, Parian", gcashRef: "9017442210906", status: "new", items: [["oreo-cinnamon-rolls", "Box of 4", 2]] },
  { daysAgo: 2, name: "Dennis Uy", mobile: "09271230014", city: "Lapu-Lapu City", address: "33 Basak-Marigondon Rd", pickup: true, status: "new", items: [["choco-cinnamon-rolls", "Box of 4", 1]] },
  { daysAgo: 1, name: "Trisha Navarro", mobile: "09151230015", city: "Talisay City", address: "Blk 12 Lot 3, Lawaan 2", notes: "Call before delivery, please.", status: "new", items: [["biscoff-cinnamon-rolls", "Box of 4", 1], ["vanilla-cupcake", "Single", 2]] },
];

/** A 1x1 PNG standing in for the customers' receipts on sample orders. */
const SAMPLE_RECEIPT = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));

const PATH: OrderStatus[] = ["confirmed", "shipped", "delivered"];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Gives existing products the photos shipped with the app, matched by slug. Returns how many changed. */
export function applySeedPhotos(): number {
  let changed = 0;
  const update = getDb().prepare("UPDATE products SET images = ? WHERE slug = ? AND images <> ?");
  for (const p of PRODUCTS) {
    const images = JSON.stringify(p.photos.map((ph) => (ph.startsWith("/") ? ph : img(ph))));
    changed += Number(update.run(images, p.slug, images).changes);
  }
  return changed;
}

/**
 * For each roll that has the owner's own photos in public/products, swaps them in if the product still shows
 * only stock (Unsplash) photos. Photos someone set in admin are left alone. Runs at server start, so a deploy
 * is enough to bring new photos to the live shop. Returns how many products changed.
 */
export function replaceStandInPhotos(): number {
  const read = getDb().prepare("SELECT images FROM products WHERE slug = ?");
  const update = getDb().prepare("UPDATE products SET images = ? WHERE slug = ?");
  let changed = 0;
  for (const p of PRODUCTS) {
    if (!p.photos.every((ph) => ph.startsWith("/"))) continue; // no photos of our own for this one yet
    const row = read.get(p.slug) as { images: string } | undefined;
    if (!row) continue;
    let current: unknown;
    try {
      current = JSON.parse(row.images);
    } catch {
      current = [];
    }
    const list = Array.isArray(current) ? current.filter((u): u is string => typeof u === "string") : [];
    const onlyStock = list.every((u) => u.includes("images.unsplash.com"));
    if (!onlyStock) continue;
    update.run(JSON.stringify(p.photos), p.slug);
    changed++;
  }
  return changed;
}

/**
 * Photos replaced by a newer file. A new file gets a new name so browsers, which keep product images for
 * up to 30 days, fetch it instead of showing the old one; this map moves existing products onto it.
 */
const RENAMED_PHOTOS: Record<string, string> = {
  "/products/chocolate.jpg": "/products/chocolate-2.jpg",
  "/products/biscoff.jpg": "/products/biscoff-2.jpg",
};

/** Points every product at the newest file for any renamed photo. Runs at server start. Returns how many changed. */
export function renameRetiredPhotos(): number {
  const rows = getDb().prepare("SELECT id, images FROM products").all() as { id: number; images: string }[];
  const update = getDb().prepare("UPDATE products SET images = ? WHERE id = ?");
  let changed = 0;
  for (const row of rows) {
    let list: unknown;
    try {
      list = JSON.parse(row.images);
    } catch {
      continue;
    }
    if (!Array.isArray(list)) continue;
    const next = list.map((u) => (typeof u === "string" && RENAMED_PHOTOS[u] ? RENAMED_PHOTOS[u] : u));
    if (next.some((u, i) => u !== list[i])) {
      update.run(JSON.stringify(next), row.id);
      changed++;
    }
  }
  return changed;
}

/** Loads the starter data only when the shop has no products at all. */
export function seedIfEmpty(): { ok: true } | { ok: false; error: string } {
  const count = (getDb().prepare("SELECT COUNT(*) AS c FROM products").get() as { c: number }).c;
  if (count > 0) return { ok: false, error: "The shop already has products, so nothing was loaded." };
  seed();
  return { ok: true };
}

/** Wipes every table, then loads the real menu, its recipes and some sample orders. */
export function seed(now: Date = new Date()): void {
  const db = getDb();
  db.exec(
    "DELETE FROM order_items; DELETE FROM orders; DELETE FROM recipe_lines; DELETE FROM recipe_variants; DELETE FROM recipes; " +
      "DELETE FROM component_items; DELETE FROM components; DELETE FROM ingredients; DELETE FROM variants; DELETE FROM products; DELETE FROM settings;",
  );

  const ingredientId = new Map<string, number>();
  for (const [name, unit, packQty, pesos] of INGREDIENTS) {
    const r = saveIngredient(null, { name, unit, packQty, packCost: peso(pesos) });
    if (!r.ok) throw new Error(`Seed ingredient ${name}: ${r.error}`);
    ingredientId.set(name, r.id);
  }
  const need = (name: string) => {
    const id = ingredientId.get(name);
    if (!id) throw new Error(`Seed: unknown ingredient ${name}`);
    return id;
  };

  const componentId = new Map<string, number>();
  for (const c of COMPONENTS) {
    const r = saveComponent(null, { name: c.name, yieldQty: c.yieldQty, yieldUnit: c.yieldUnit, notes: c.notes, items: c.items.map(([name, qty]) => ({ ingredientId: need(name), qty })) });
    if (!r.ok) throw new Error(`Seed component ${c.name}: ${r.error}`);
    componentId.set(c.name, r.id);
  }

  for (const p of PRODUCTS) {
    const r = createProduct({
      slug: p.slug, name: p.name, category: p.category, description: p.description, howToUse: p.howToUse,
      price: 0, compareAt: null, images: p.photos.map((ph) => (ph.startsWith("/") ? ph : img(ph))), featured: p.featured, active: true,
      variants: p.variants.map(([name, stock, sku]) => ({ name, stock, sku })),
    });
    if (!r.ok) throw new Error(`Seed product ${p.slug}: ${r.error}`);
  }

  // Recipes, then prices: every option is priced at the recipe's suggested price (cost × markup + packaging),
  // which is how the costing file prices them.
  for (const p of listProducts()) {
    const seed = PRODUCTS.find((s) => s.slug === p.slug)!;
    const line = ([name, qty]: [string, number]) =>
      componentId.has(name) ? { componentId: componentId.get(name)!, qty } : { ingredientId: need(name), qty };
    const saved = saveRecipe(p.id, {
      yield: seed.recipe.yield, labourMinutes: seed.recipe.labour, packagingCost: peso(seed.recipe.packaging), notes: seed.recipe.notes,
      items: seed.recipe.items.map(line),
      variants: p.variants.map((v) => {
        const sv = seed.variants.find((x) => x[0] === v.name)!;
        return { variantId: v.id, pieces: sv[3], packagingCost: peso(sv[4]), items: [] };
      }),
    });
    if (!saved.ok) throw new Error(`Seed recipe ${p.slug}: ${saved.error}`);
    for (const v of p.variants) {
      const set = seed.prices?.[v.name];
      if (set !== undefined) {
        getDb().prepare("UPDATE variants SET price = ? WHERE id = ?").run(peso(set), v.id);
        continue;
      }
      const priced = applySuggestedPrice(p.id, v.id);
      if (!priced.ok) throw new Error(`Seed price ${p.slug} ${v.name}: ${priced.error}`);
    }
    // The product price is the cheapest option, for sorting and "from" labels.
    const cheapest = Math.min(...p.variants.map((v) => (getDb().prepare("SELECT price FROM variants WHERE id = ?").get(v.id) as { price: number }).price));
    getDb().prepare("UPDATE products SET price = ? WHERE id = ?").run(cheapest, p.id);
  }

  const variantId = new Map<string, number>();
  for (const p of listProducts()) for (const v of p.variants) variantId.set(`${p.slug}|${v.name}`, v.id);

  for (const o of ORDERS) {
    const placedAt = new Date(now.getTime() - o.daysAgo * DAY_MS);
    const r = placeOrder(
      {
        customerName: o.name, mobile: o.mobile, province: "Cebu", city: o.city, address: o.address, preferredDate: manilaDate(placedAt, 3),
        notes: o.notes, fulfilment: o.pickup || pickupOnly() ? "pickup" : "delivery", paymentMethod: o.gcashRef ? "gcash" : "bank", gcashRef: o.gcashRef, proof: { name: "sample-receipt.png", data: SAMPLE_RECEIPT },
        lines: o.items.map(([slug, variant, qty]) => ({ variantId: variantId.get(`${slug}|${variant}`) ?? -1, qty })),
      },
      placedAt,
    );
    if (!r.ok) throw new Error(`Seed order for ${o.name}: ${r.error}`);
    const id = getOrderByCode(r.code)!.id;
    const steps = o.status === "cancelled" ? ["cancelled" as const] : PATH.slice(0, PATH.indexOf(o.status) + 1);
    for (const s of steps) {
      const moved = changeStatus(id, s);
      if (!moved.ok) throw new Error(`Seed order ${r.code}: ${moved.error}`);
    }
  }
}
