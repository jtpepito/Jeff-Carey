import type { CartLineInfo } from "./products";

export type CartLine = {
  variantId: number; qty: number; productName: string; variantName: string; slug: string;
  price: number; image: string | null; stock: number;
};

export const CART_KEY = "bl-cart-v1";

const lineName = (l: { productName: string; variantName: string }) => `${l.productName} — ${l.variantName}`;

function isLine(x: unknown): x is CartLine {
  if (!x || typeof x !== "object") return false;
  const l = x as Record<string, unknown>;
  return (
    Number.isInteger(l.variantId) && Number.isInteger(l.qty) && (l.qty as number) >= 1 &&
    typeof l.productName === "string" && typeof l.variantName === "string" && typeof l.slug === "string" &&
    Number.isInteger(l.price) && Number.isInteger(l.stock) && (l.image === null || typeof l.image === "string")
  );
}

/** Reads whatever is in localStorage. Anything unreadable becomes an empty cart; bad entries are dropped. */
export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isLine) : [];
  } catch {
    return [];
  }
}

const clamp = (qty: number, stock: number) => Math.max(1, Math.min(qty, stock));

export function addLine(cart: CartLine[], line: CartLine): CartLine[] {
  const existing = cart.find((l) => l.variantId === line.variantId);
  if (!existing) return [...cart, { ...line, qty: clamp(line.qty, line.stock) }];
  return cart.map((l) =>
    l.variantId === line.variantId ? { ...l, ...line, qty: clamp(l.qty + line.qty, line.stock) } : l,
  );
}

export function setQty(cart: CartLine[], variantId: number, qty: number): CartLine[] {
  if (qty <= 0) return cart.filter((l) => l.variantId !== variantId);
  return cart.map((l) => (l.variantId === variantId ? { ...l, qty: clamp(qty, l.stock) } : l));
}

/** Brings a stored cart in line with the database: drops dead lines, lowers quantities, refreshes prices. */
export function reconcile(cart: CartLine[], fresh: CartLineInfo[]): { cart: CartLine[]; removed: string[]; reduced: string[] } {
  const byId = new Map(fresh.map((f) => [f.variantId, f]));
  const out: CartLine[] = [];
  const removed: string[] = [];
  const reduced: string[] = [];
  for (const l of cart) {
    const f = byId.get(l.variantId);
    if (!f || f.stock <= 0) {
      removed.push(lineName(l));
      continue;
    }
    if (l.qty > f.stock) reduced.push(lineName(f));
    out.push({ ...f, qty: Math.min(l.qty, f.stock) });
  }
  return { cart: out, removed, reduced };
}

export const subtotalOf = (cart: CartLine[]) => cart.reduce((sum, l) => sum + l.price * l.qty, 0);
export const countOf = (cart: CartLine[]) => cart.reduce((sum, l) => sum + l.qty, 0);
