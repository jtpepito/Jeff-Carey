import { parsePeso } from "./money";
import type { ProductInput } from "./products";

/** The admin product form as typed: every number is still text. */
export type ProductFormValues = {
  name: string; slug: string; category: string; description: string; howToUse: string;
  price: string; compareAt: string; images: string; // images: one URL per line
  featured: boolean; active: boolean;
  variants: { id?: number; name: string; sku: string; stock: string }[];
};

type Parsed = { ok: true; input: ProductInput } | { ok: false; field: string; error: string };

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents: ñ -> n
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toProductInput(v: ProductFormValues): Parsed {
  const price = parsePeso(v.price ?? "");
  if (price === null) return { ok: false, field: "price", error: "Enter a price like 450 or 1,299.50." };

  let compareAt: number | null = null;
  if ((v.compareAt ?? "").trim()) {
    compareAt = parsePeso(v.compareAt);
    if (compareAt === null) return { ok: false, field: "compareAt", error: "Enter an amount like 550, or leave it blank." };
  }

  const images = (v.images ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (images.some((url) => !url.startsWith("https://")))
    return { ok: false, field: "images", error: "Each image must be a full link starting with https://" };

  const variants: ProductInput["variants"] = [];
  for (const row of Array.isArray(v.variants) ? v.variants : []) {
    if (!/^\d+$/.test((row.stock ?? "").trim()))
      return { ok: false, field: "variants", error: "Stock must be a whole number, 0 or more." };
    variants.push({ id: row.id, name: row.name ?? "", sku: row.sku ?? "", stock: Number(row.stock.trim()) });
  }

  return {
    ok: true,
    input: {
      name: v.name ?? "", slug: (v.slug ?? "").trim(), category: v.category ?? "",
      description: v.description ?? "", howToUse: v.howToUse ?? "",
      price, compareAt, images, featured: Boolean(v.featured), active: Boolean(v.active), variants,
    },
  };
}
