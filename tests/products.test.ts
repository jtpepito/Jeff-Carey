import { beforeEach, expect, test } from "vitest";
import {
  cartLineInfo, createProduct, getProductById, getProductBySlug, listCategories, listProducts,
  lowStockVariants, relatedProducts, removeProduct, updateProduct, type ProductInput,
} from "@/lib/products";
import { freshDb } from "./helpers";

beforeEach(freshDb);

function sample(over: Partial<ProductInput> = {}): ProductInput {
  return {
    slug: "benguet-arabica", name: "Benguet Arabica", category: "Coffee", description: "Bright.", howToUse: "Brew.",
    price: 45000, compareAt: null, images: ["https://images.unsplash.com/a"], featured: false, active: true,
    variants: [{ name: "250g", stock: 10, sku: "BA-250" }, { name: "500g", stock: 0, sku: "BA-500" }],
    ...over,
  };
}

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

test("update can keep its own slug but not take another product's", () => {
  const { id } = createProduct(sample()) as { ok: true; id: number };
  createProduct(sample({ slug: "wild-honey", name: "Wild Honey" }));
  expect(updateProduct(id, sample({ name: "Renamed" })).ok).toBe(true);
  expect(updateProduct(id, sample({ slug: "wild-honey" }))).toMatchObject({ ok: false, field: "slug" });
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
  expect(listProducts({ sort: "price-asc" }).map((p) => p.price)).toEqual([30000, 45000]);
  expect(listProducts({ sort: "featured" })[0].slug).toBe("wild-honey");
  expect(listCategories()).toEqual(["Coffee", "Pantry"]);
});

test("related products share the category and exclude the product itself", () => {
  createProduct(sample());
  for (const n of ["a", "b", "c", "d"]) createProduct(sample({ slug: n, name: n }));
  createProduct(sample({ slug: "wild-honey", name: "Wild Honey", category: "Pantry" }));
  const related = relatedProducts(getProductBySlug("benguet-arabica")!);
  expect(related).toHaveLength(3);
  expect(related.every((p) => p.category === "Coffee" && p.slug !== "benguet-arabica")).toBe(true);
});

test("removeProduct deletes when there is no order history", () => {
  const { id } = createProduct(sample()) as { ok: true; id: number };
  expect(removeProduct(id)).toBe("deleted");
  expect(getProductById(id)).toBeNull();
});

test("cartLineInfo skips unknown ids and inactive products", () => {
  const { id } = createProduct(sample()) as { ok: true; id: number };
  const vid = getProductById(id)!.variants[0].id;
  expect(cartLineInfo([vid, 99999])).toEqual([
    { variantId: vid, productName: "Benguet Arabica", variantName: "250g", slug: "benguet-arabica", price: 45000, stock: 10, image: "https://images.unsplash.com/a" },
  ]);
  updateProduct(id, { ...sample(), active: false, variants: getProductById(id)!.variants });
  expect(cartLineInfo([vid])).toEqual([]);
  expect(cartLineInfo([])).toEqual([]);
});

test("lowStockVariants lists active variants at or below the limit", () => {
  createProduct(sample({ variants: [{ name: "250g", stock: 6, sku: "" }, { name: "500g", stock: 5, sku: "" }, { name: "1kg", stock: 0, sku: "" }] }));
  createProduct(sample({ slug: "hidden", active: false, variants: [{ name: "x", stock: 1, sku: "" }] }));
  expect(lowStockVariants().map((v) => [v.variantName, v.stock])).toEqual([["1kg", 0], ["500g", 5]]);
});
