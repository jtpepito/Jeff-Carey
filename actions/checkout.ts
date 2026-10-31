"use server";

import { clientIp } from "@/lib/client-ip";
import { placeOrder, type OrderInput, type PlaceResult } from "@/lib/orders";
import { MAX_PROOF_BYTES } from "@/lib/payment";
import { checkoutLimiter } from "@/lib/rate-limit";
import { shrinkProof } from "@/lib/shrink-proof";

/**
 * Places the order. The form sends the order as JSON in "order" and the receipt file in "proof".
 * Prices and stock are re-read from the database; nothing the browser sends is trusted for totals,
 * and the receipt's type is judged from its contents.
 */
export async function submitOrder(form: FormData): Promise<PlaceResult> {
  if (!checkoutLimiter.hit(await clientIp()).ok)
    return { ok: false, field: "network", error: "Too many orders from this connection in the past hour. Please try again later." };
  let input: Partial<OrderInput>;
  try {
    input = JSON.parse(String(form?.get("order") ?? ""));
  } catch {
    return { ok: false, field: "lines", error: "Something went wrong. Please try again." };
  }
  if (!input || typeof input !== "object") return { ok: false, field: "lines", error: "Something went wrong. Please try again." };

  const file = form.get("proof");
  let proof: OrderInput["proof"];
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PROOF_BYTES) return { ok: false, field: "proof", error: "That file is over 5 MB. Please attach a smaller screenshot or photo." };
    proof = await shrinkProof({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) });
  }

  return placeOrder({
    customerName: String(input.customerName ?? ""),
    mobile: String(input.mobile ?? ""),
    email: String(input.email ?? "").slice(0, 300),
    province: String(input.province ?? ""),
    city: String(input.city ?? ""),
    address: String(input.address ?? ""),
    notes: String(input.notes ?? "").slice(0, 500),
    paymentMethod: input.paymentMethod as OrderInput["paymentMethod"],
    gcashRef: String(input.gcashRef ?? "").slice(0, 60),
    proof,
    lines: Array.isArray(input.lines) ? input.lines : [],
    fulfilment: input.fulfilment,
    preferredDate: String(input.preferredDate ?? "").slice(0, 10),
    requestId: typeof input.requestId === "string" ? input.requestId.slice(0, 80) : undefined,
  });
}
