import { getDb, tx } from "./db";

export type Variant = { id: number; productId: number; name: string; stock: number; sku: string };
export type Product = {
  id: number; slug: string; name: string; category: string; description: string; howToUse: string;
  price: number; compareAt: number | null; images: string[]; featured: boolean; active: boolean;
  variants: Variant[];
};
export type ProductInput = Omit<Product, "id" | "variants"> & {
  /** stockWas is the stock the edit form loaded. With it, a save applies only the difference, so units sold meanwhile are not put back. */
  variants: { id?: number; name: string; stock: number; sku: string; stockWas?: number }[];
};
export type SaveResult = { ok: true; id: number } | { ok: false; error: string; field: string };
export type CartLineInfo = {
  variantId: number; productName: string; variantName: string; slug: string;
  price: number; stock: number; image: string | null;
};
export type ProductSort = "featured" | "price-asc" | "price-desc";

type ProductRow = {
  id: number; slug: string; name: string; category: string; description: string; how_to_use: string;
  price: number; compare_at: number | null; images: string; featured: number; active: number;
};
type VariantRow = { id: number; product_id: number; name: string; stock: number; sku: string };

function parseImages(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function hydrate(rows: ProductRow[]): Product[] {
  if (rows.length === 0) return [];
  const marks = rows.map(() => "?").join(",");
  const variants = getDb()
    .prepare(`SELECT id, product_id, name, stock, sku FROM variants WHERE product_id IN (${marks}) ORDER BY id`)
    .all(...rows.map((r) => r.id)) as VariantRow[];
  return rows.map((r) => ({
    id: r.id, slug: r.slug, name: r.name, category: r.category, description: r.description,
    howToUse: r.how_to_use, price: r.price, compareAt: r.compare_at, images: parseImages(r.images),
    featured: r.featured === 1, active: r.active === 1,
    variants: variants
      .filter((v) => v.product_id === r.id)
      .map((v) => ({ id: v.id, productId: v.product_id, name: v.name, stock: v.stock, sku: v.sku })),
  }));
}

const ORDER_BY: Record<ProductSort, string> = {
  featured: "featured DESC, id ASC",
  "price-asc": "price ASC, id ASC",
  "price-desc": "price DESC, id ASC",
};

export function listProducts(
  opts: { category?: string; q?: string; sort?: ProductSort; includeInactive?: boolean } = {},
): Product[] {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (!opts.includeInactive) where.push("active = 1");
  if (opts.category) { where.push("category = ?"); params.push(opts.category); }
  if (opts.q?.trim()) { where.push("name LIKE ? ESCAPE '\\'"); params.push(`%${opts.q.trim().replace(/[\\%_]/g, "\\$&")}%`); }
  const sql = `SELECT * FROM products ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY ${ORDER_BY[opts.sort ?? "featured"] ?? ORDER_BY.featured}`;
  return hydrate(getDb().prepare(sql).all(...params) as ProductRow[]);
}

export function listCategories(): string[] {
  const rows = getDb().prepare("SELECT DISTINCT category FROM products WHERE active = 1 ORDER BY category").all();
  return rows.map((r) => r.category as string);
}

export function getProductBySlug(slug: string): Product | null {
  const row = getDb().prepare("SELECT * FROM products WHERE slug = ? AND active = 1").get(slug) as ProductRow | undefined;
  return row ? hydrate([row])[0] : null;
}

export function getProductById(id: number): Product | null {
  const row = getDb().prepare("SELECT * FROM products WHERE id = ?").get(id) as ProductRow | undefined;
  return row ? hydrate([row])[0] : null;
}

export function relatedProducts(p: Product, n = 3): Product[] {
  const rows = getDb()
    .prepare("SELECT * FROM products WHERE category = ? AND active = 1 AND id <> ? ORDER BY featured DESC, id ASC LIMIT ?")
    .all(p.category, p.id, n) as ProductRow[];
  return hydrate(rows);
}

function validate(input: ProductInput, selfId: number | null): { field: string; error: string } | null {
  if (!input.name?.trim()) return { field: "name", error: "Enter a product name." };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug ?? ""))
    return { field: "slug", error: "Use lowercase letters, numbers and dashes only, like benguet-arabica." };
  const taken = getDb().prepare("SELECT id FROM products WHERE slug = ?").get(input.slug) as { id: number } | undefined;
  if (taken && taken.id !== selfId) return { field: "slug", error: "That slug is already used by another product." };
  if (!input.category?.trim()) return { field: "category", error: "Enter a category." };
  if (!Number.isInteger(input.price) || input.price < 0) return { field: "price", error: "Enter a valid price." };
  if (!Array.isArray(input.variants) || input.variants.length === 0)
    return { field: "variants", error: "Add at least one variant." };
  for (const v of input.variants) {
    if (!v.name?.trim()) return { field: "variants", error: "Every variant needs a name." };
    if (!Number.isInteger(v.stock) || v.stock < 0)
      return { field: "variants", error: "Stock must be a whole number, 0 or more." };
  }
  return null;
}

function columns(input: ProductInput) {
  const compareAt = input.compareAt != null && input.compareAt > input.price ? input.compareAt : null;
  return [
    input.slug, input.name.trim(), input.category.trim(), input.description ?? "", input.howToUse ?? "",
    input.price, compareAt, JSON.stringify(input.images ?? []), input.featured ? 1 : 0, input.active ? 1 : 0,
  ] as (string | number | null)[];
}

export function createProduct(input: ProductInput): SaveResult {
  const bad = validate(input, null);
  if (bad) return { ok: false, ...bad };
  return tx((db) => {
    const id = Number(
      db.prepare(
        `INSERT INTO products (slug, name, category, description, how_to_use, price, compare_at, images, featured, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(...columns(input)).lastInsertRowid,
    );
    const add = db.prepare("INSERT INTO variants (product_id, name, stock, sku) VALUES (?, ?, ?, ?)");
    for (const v of input.variants) add.run(id, v.name.trim(), v.stock, v.sku?.trim() ?? "");
    return { ok: true as const, id };
  });
}

export function updateProduct(id: number, input: ProductInput): SaveResult {
  if (!getProductById(id)) return { ok: false, field: "name", error: "This product no longer exists." };
  const bad = validate(input, id);
  if (bad) return { ok: false, ...bad };
  return tx((db) => {
    db.prepare(
      `UPDATE products SET slug = ?, name = ?, category = ?, description = ?, how_to_use = ?, price = ?,
         compare_at = ?, images = ?, featured = ?, active = ? WHERE id = ?`,
    ).run(...columns(input), id);

    const existing = (db.prepare("SELECT id FROM variants WHERE product_id = ?").all(id) as { id: number }[]).map((r) => r.id);
    const kept = new Set(input.variants.filter((v) => v.id != null && existing.includes(v.id)).map((v) => v.id!));
    const del = db.prepare("DELETE FROM variants WHERE id = ?");
    for (const vid of existing) if (!kept.has(vid)) del.run(vid);

    const upd = db.prepare("UPDATE variants SET name = ?, stock = ?, sku = ? WHERE id = ?");
    const updByDiff = db.prepare("UPDATE variants SET name = ?, stock = MAX(0, stock + ?), sku = ? WHERE id = ?");
    const add = db.prepare("INSERT INTO variants (product_id, name, stock, sku) VALUES (?, ?, ?, ?)");
    for (const v of input.variants) {
      if (v.id != null && kept.has(v.id)) {
        if (Number.isInteger(v.stockWas)) updByDiff.run(v.name.trim(), v.stock - v.stockWas!, v.sku?.trim() ?? "", v.id);
        else upd.run(v.name.trim(), v.stock, v.sku?.trim() ?? "", v.id);
      }
      else add.run(id, v.name.trim(), v.stock, v.sku?.trim() ?? "");
    }
    return { ok: true as const, id };
  });
}

/** Products with order history are deactivated so past orders keep their link; others are deleted. */
export function removeProduct(id: number): "deleted" | "deactivated" {
  return tx((db) => {
    const used = db.prepare("SELECT 1 FROM order_items WHERE product_id = ? LIMIT 1").get(id);
    if (used) {
      db.prepare("UPDATE products SET active = 0 WHERE id = ?").run(id);
      return "deactivated" as const;
    }
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    return "deleted" as const;
  });
}

export function cartLineInfo(variantIds: number[]): CartLineInfo[] {
  const ids = [...new Set(variantIds.filter((n) => Number.isInteger(n)))].slice(0, 200);
  if (ids.length === 0) return [];
  const rows = getDb()
    .prepare(
      `SELECT v.id AS variantId, p.name AS productName, v.name AS variantName, p.slug, p.price, v.stock, p.images
       FROM variants v JOIN products p ON p.id = v.product_id
       WHERE p.active = 1 AND v.id IN (${ids.map(() => "?").join(",")}) ORDER BY v.id`,
    )
    .all(...ids) as (Omit<CartLineInfo, "image"> & { images: string })[];
  return rows.map(({ images, ...r }) => ({ ...r, image: parseImages(images)[0] ?? null }));
}

export function lowStockVariants(max = 5) {
  return getDb()
    .prepare(
      `SELECT v.id AS variantId, p.id AS productId, p.name AS productName, v.name AS variantName, v.stock
       FROM variants v JOIN products p ON p.id = v.product_id
       WHERE p.active = 1 AND v.stock <= ? ORDER BY v.stock ASC, p.name ASC, v.id ASC`,
    )
    .all(max) as { variantId: number; productId: number; productName: string; variantName: string; stock: number }[];
}
