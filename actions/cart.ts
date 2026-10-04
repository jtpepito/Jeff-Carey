"use server";

import { cartLineInfo, type CartLineInfo } from "@/lib/products";

/** Current price and stock for the variants in a shopper's cart. */
export async function refreshCart(variantIds: number[]): Promise<CartLineInfo[]> {
  if (!Array.isArray(variantIds)) return [];
  return cartLineInfo(variantIds.filter((n) => Number.isInteger(n)));
}
