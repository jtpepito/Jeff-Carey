import { expect, test } from "vitest";
import { slugify, toProductInput, type ProductFormValues } from "@/lib/product-form";

const form = (over: Partial<ProductFormValues> = {}): ProductFormValues => ({
  name: "Wild Honey", slug: "wild-honey", category: "Pantry", description: "", howToUse: "",
  price: "1,299.50", compareAt: "", images: "https://images.unsplash.com/a\n\n https://images.unsplash.com/b ",
  featured: false, active: true, variants: [{ name: "250ml", sku: "", stock: "12" }], ...over,
});

test("parses a valid form", () => {
  const r = toProductInput(form());
  expect(r).toMatchObject({
    ok: true,
    input: {
      price: 129950, compareAt: null,
      images: ["https://images.unsplash.com/a", "https://images.unsplash.com/b"],
      variants: [{ name: "250ml", stock: 12 }],
    },
  });
});

test("keeps variant ids and parses compare-at", () => {
  const r = toProductInput(form({ compareAt: "1,500", variants: [{ id: 7, name: "250ml", sku: "H-250", stock: "0" }] }));
  expect(r).toMatchObject({ ok: true, input: { compareAt: 150000, variants: [{ id: 7, name: "250ml", sku: "H-250", stock: 0 }] } });
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
  expect(slugify("Piña & Niño")).toBe("pina-nino");
});
