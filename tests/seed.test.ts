import { beforeEach, expect, test } from "vitest";
import { getDb } from "@/lib/db";
import { listOrders } from "@/lib/orders";
import { priceRange } from "@/lib/pricing";
import { listCategories, listProducts } from "@/lib/products";
import { getRecipe, listComponents, listIngredients, productCosts } from "@/lib/recipes";
import { applySeedPhotos, renameRetiredPhotos, replaceStandInPhotos, seed, seedIfEmpty } from "@/lib/seed-data";
import { freshDb } from "./helpers";

beforeEach(freshDb);

test("seed loads the real menu, its recipes and 15 mixed-status orders", () => {
  seed(new Date("2026-10-04T03:00:00Z"));
  const products = listProducts();
  expect(products).toHaveLength(5);
  expect(listCategories()).toEqual(["Cinnamon Rolls", "Cupcakes"]);
  expect(products.filter((p) => p.featured)).toHaveLength(3);
  expect(listIngredients().length).toBeGreaterThanOrEqual(30);
  expect(listComponents().map((c) => c.name)).toContain("Cinnamon roll dough");

  const orders = listOrders();
  expect(orders).toHaveLength(15);
  expect(new Set(orders.map((o) => o.status)).size).toBe(5);
  for (const o of orders) expect(o.total).toBe(o.subtotal + o.shippingFee);
  expect(orders.filter((o) => o.paymentMethod === "gcash")).toHaveLength(6);
  expect(orders.filter((o) => o.fulfilment === "pickup").length).toBeGreaterThanOrEqual(3);
  expect((getDb().prepare("SELECT MIN(stock) m FROM variants").get() as { m: number }).m).toBe(0);

  // Every product has a recipe and every option is priced at its suggested price.
  expect(productCosts().size).toBe(5);
  for (const p of products) {
    const r = getRecipe(p.id)!;
    for (const v of r.variants) expect(v.price === v.suggestedPrice || p.slug === "vanilla-cupcake").toBe(true);
    expect(p.price).toBe(priceRange(p).min);
  }
});

test("the OG cinnamon roll costs what the costing file says", () => {
  seed();
  const og = listProducts().find((p) => p.slug === "og-cinnamon-rolls")!;
  const r = getRecipe(og.id)!;
  // Dough ₱184.28 + OG filling ₱113.42 + cream cheese topping ₱102.52, over 42 rolls: about ₱9.53 a roll.
  expect(r.cost.batchCost).toBeGreaterThan(40000);
  expect(r.cost.batchCost).toBeLessThan(40100);
  expect(Math.round(r.cost.perPiece)).toBe(953);
  const box4 = r.variants.find((v) => v.name === "Box of 4")!;
  expect(box4.cost.unitCost).toBe(Math.round(r.cost.perPiece * 4) + 4000);
  // The file prices a Box of 4 at ₱230.63: cost × 5 + ₱40 packaging.
  expect(box4.suggestedPrice).toBeGreaterThanOrEqual(23000);
  expect(box4.suggestedPrice).toBeLessThanOrEqual(23100);
});

test("seeding twice gives the same counts", () => {
  seed();
  seed();
  expect(listProducts()).toHaveLength(5);
  expect(listOrders()).toHaveLength(15);
  expect(listComponents()).toHaveLength(5);
});

test("seedIfEmpty loads the menu only into an empty shop", () => {
  expect(seedIfEmpty()).toEqual({ ok: true });
  expect(listProducts()).toHaveLength(5);
  expect(seedIfEmpty()).toMatchObject({ ok: false });
  expect(listProducts()).toHaveLength(5);
});

test("applySeedPhotos swaps stand-in photos for the ones shipped with the app, by slug", () => {
  seed();
  getDb().prepare("UPDATE products SET images = ? WHERE slug = ?").run(JSON.stringify(["https://images.unsplash.com/photo-x"]), "og-cinnamon-rolls");
  expect(applySeedPhotos()).toBe(1);
  const og = listProducts().find((p) => p.slug === "og-cinnamon-rolls")!;
  expect(og.images).toEqual(["/products/original.jpg", "/products/cover-1-v2.jpg"]);
  expect(applySeedPhotos()).toBe(0); // nothing left to change
});

test("replaceStandInPhotos gives rolls still on stock photos the owner's photos, and leaves chosen photos alone", () => {
  seed();
  const stock = JSON.stringify(["https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=1200"]);
  const set = (slug: string, images: string) => getDb().prepare("UPDATE products SET images = ? WHERE slug = ?").run(images, slug);
  set("og-cinnamon-rolls", stock);
  set("biscoff-cinnamon-rolls", stock);
  set("choco-cinnamon-rolls", JSON.stringify(["https://example.com/my-own-photo.jpg"]));
  const images = (slug: string) => listProducts().find((p) => p.slug === slug)!.images;
  const oreoBefore = images("oreo-cinnamon-rolls");

  expect(replaceStandInPhotos()).toBe(2);
  expect(images("og-cinnamon-rolls")).toEqual(["/products/original.jpg", "/products/cover-1-v2.jpg"]);
  expect(images("biscoff-cinnamon-rolls")).toEqual(["/products/biscoff-2.jpg", "/products/cover-2-v2.jpg"]);
  expect(images("choco-cinnamon-rolls")).toEqual(["https://example.com/my-own-photo.jpg"]); // chosen in admin: kept
  expect(images("oreo-cinnamon-rolls")).toEqual(oreoBefore); // no photo of our own yet
  expect(replaceStandInPhotos()).toBe(0);
});

test("photos that were replaced by a newer file are renamed wherever they are used", () => {
  seed();
  const set = (slug: string, images: string[]) => getDb().prepare("UPDATE products SET images = ? WHERE slug = ?").run(JSON.stringify(images), slug);
  set("choco-cinnamon-rolls", ["/products/chocolate.jpg", "/products/cover-1-v2.jpg"]);
  set("oreo-cinnamon-rolls", ["https://example.com/oreo.jpg", "/products/chocolate.jpg"]);
  const images = (slug: string) => listProducts().find((p) => p.slug === slug)!.images;

  expect(renameRetiredPhotos()).toBe(2);
  expect(images("choco-cinnamon-rolls")).toEqual(["/products/chocolate-2.jpg", "/products/cover-1-v2.jpg"]);
  expect(images("oreo-cinnamon-rolls")).toEqual(["https://example.com/oreo.jpg", "/products/chocolate-2.jpg"]);
  expect(renameRetiredPhotos()).toBe(0);
});

test("a fresh seed already uses the newest chocolate photo", () => {
  seed();
  expect(listProducts().find((p) => p.slug === "choco-cinnamon-rolls")!.images[0]).toBe("/products/chocolate-2.jpg");
});

test("the Biscoff roll moves from the old photo to the cleaner one", () => {
  seed();
  getDb().prepare("UPDATE products SET images = ? WHERE slug = ?").run(JSON.stringify(["/products/biscoff.jpg", "/products/cover-2-v2.jpg"]), "biscoff-cinnamon-rolls");
  expect(renameRetiredPhotos()).toBe(1);
  expect(listProducts().find((p) => p.slug === "biscoff-cinnamon-rolls")!.images).toEqual(["/products/biscoff-2.jpg", "/products/cover-2-v2.jpg"]);
});

test("a fresh seed already uses the newest Biscoff photo", () => {
  seed();
  expect(listProducts().find((p) => p.slug === "biscoff-cinnamon-rolls")!.images[0]).toBe("/products/biscoff-2.jpg");
});

test("the two tray cover photos move to their cleaner versions wherever they are used", () => {
  seed();
  const set = (slug: string, images: string[]) => getDb().prepare("UPDATE products SET images = ? WHERE slug = ?").run(JSON.stringify(images), slug);
  set("og-cinnamon-rolls", ["/products/original.jpg", "/products/cover-1.jpg"]);
  set("biscoff-cinnamon-rolls", ["/products/biscoff-2.jpg", "/products/cover-2.jpg"]);
  renameRetiredPhotos();
  const images = (slug: string) => listProducts().find((p) => p.slug === slug)!.images;
  expect(images("og-cinnamon-rolls")).toEqual(["/products/original.jpg", "/products/cover-1-v2.jpg"]);
  expect(images("biscoff-cinnamon-rolls")).toEqual(["/products/biscoff-2.jpg", "/products/cover-2-v2.jpg"]);
});

test("a fresh seed already uses the cleaner tray covers", () => {
  seed();
  const all = listProducts().flatMap((p) => p.images);
  expect(all).not.toContain("/products/cover-1.jpg");
  expect(all).not.toContain("/products/cover-2.jpg");
  expect(all).toContain("/products/cover-1-v2.jpg");
  expect(all).toContain("/products/cover-2-v2.jpg");
});
