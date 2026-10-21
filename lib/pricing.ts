/** Price helpers with no database access, safe to use in client components. */

type Priced = { price: number; variants: { price: number | null }[] };

/** The price a shopper pays for one option: its own price, or the product price. */
export const variantPrice = (product: { price: number }, v: { price: number | null }) => v.price ?? product.price;

/** Cheapest and dearest option of a product, for "from" labels. */
export function priceRange(product: Priced): { min: number; max: number } {
  const prices = product.variants.length ? product.variants.map((v) => variantPrice(product, v)) : [product.price];
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
