import { getDb } from "@/lib/db";
import type { OrderInput } from "@/lib/orders";
import { createProduct, getProductById, type ProductInput } from "@/lib/products";
import { freshDb } from "./helpers";

export const NOW = new Date("2026-10-04T03:00:00Z");

export const product: ProductInput = {
  slug: "benguet-arabica", name: "Benguet Arabica", category: "Coffee", description: "", howToUse: "",
  price: 50000, compareAt: null, images: [], featured: false, active: true,
  variants: [{ name: "250g", stock: 5, sku: "" }, { name: "500g", stock: 1, sku: "" }],
};

export const ids = { v250: 0, v500: 0, productId: 0 };

/** Fresh database with one product: 250g (stock 5) and 500g (stock 1), ₱500. */
export function setupShop() {
  freshDb();
  ids.productId = (createProduct(product) as { ok: true; id: number }).id;
  [ids.v250, ids.v500] = getProductById(ids.productId)!.variants.map((v) => v.id);
}

export function order(over: Partial<OrderInput> = {}): OrderInput {
  return {
    customerName: "Ana Reyes", mobile: "09171234567", province: "Cebu", city: "Cebu City",
    address: "12 Mabini St", paymentMethod: "cod", lines: [{ variantId: ids.v250, qty: 1 }], ...over,
  };
}

export const stock = (id: number) =>
  (getDb().prepare("SELECT stock FROM variants WHERE id = ?").get(id) as { stock: number }).stock;
export const orderCount = () => (getDb().prepare("SELECT COUNT(*) c FROM orders").get() as { c: number }).c;
