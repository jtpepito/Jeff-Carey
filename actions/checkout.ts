"use server";

import { placeOrder, type OrderInput, type PlaceResult } from "@/lib/orders";

/** Places the order. Prices and stock are re-read from the database; nothing the browser sends is trusted for totals. */
export async function submitOrder(input: OrderInput): Promise<PlaceResult> {
  if (!input || typeof input !== "object") return { ok: false, field: "lines", error: "Something went wrong. Please try again." };
  return placeOrder({
    customerName: String(input.customerName ?? ""),
    mobile: String(input.mobile ?? ""),
    province: String(input.province ?? ""),
    city: String(input.city ?? ""),
    address: String(input.address ?? ""),
    notes: String(input.notes ?? "").slice(0, 500),
    paymentMethod: input.paymentMethod,
    gcashRef: String(input.gcashRef ?? "").slice(0, 60),
    lines: Array.isArray(input.lines) ? input.lines : [],
    fulfilment: input.fulfilment,
    requestId: typeof input.requestId === "string" ? input.requestId.slice(0, 80) : undefined,
  });
}
