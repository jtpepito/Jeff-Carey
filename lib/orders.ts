import { tx } from "./db";
import { nextOrderCode } from "./order-code";
import { isValidLocation, regionGroupOf } from "./ph-locations";
import { getSettings } from "./settings";
import { shippingFee } from "./shipping";

export type OrderInput = {
  customerName: string; mobile: string; province: string; city: string; address: string;
  notes?: string; paymentMethod: "cod" | "gcash"; gcashRef?: string;
  lines: { variantId: number; qty: number }[];
};
export type PlaceResult = { ok: true; code: string } | { ok: false; error: string; field: string };

const MAX_QTY_PER_LINE = 99;

class OrderError extends Error {
  constructor(message: string, public field: string) {
    super(message);
  }
}
const fail = (field: string, error: string): PlaceResult => ({ ok: false, field, error });

export function placeOrder(input: OrderInput, now: Date = new Date()): PlaceResult {
  const customerName = input.customerName?.trim() ?? "";
  const mobile = (input.mobile ?? "").replace(/[\s-]/g, "");
  const address = input.address?.trim() ?? "";
  const gcashRef = input.gcashRef?.trim() ?? "";

  if (!customerName) return fail("customerName", "Enter your name.");
  if (!/^09\d{9}$/.test(mobile)) return fail("mobile", "Enter an 11-digit mobile number starting with 09.");
  const group = regionGroupOf(input.province);
  if (!group) return fail("province", "Choose a province.");
  if (!isValidLocation(input.province, input.city)) return fail("city", "Choose a city or municipality.");
  if (!address) return fail("address", "Enter your street address.");
  if (input.paymentMethod !== "cod" && input.paymentMethod !== "gcash")
    return fail("paymentMethod", "Choose a payment method.");
  if (input.paymentMethod === "gcash" && !gcashRef) return fail("gcashRef", "Enter your GCash reference number.");

  const merged = new Map<number, number>();
  for (const l of Array.isArray(input.lines) ? input.lines : []) {
    if (!Number.isInteger(l?.variantId) || !Number.isInteger(l?.qty) || l.qty < 1 || l.qty > MAX_QTY_PER_LINE)
      return fail("lines", "One of the quantities in your cart is not valid.");
    merged.set(l.variantId, (merged.get(l.variantId) ?? 0) + l.qty);
  }
  if (merged.size === 0) return fail("lines", "Your cart is empty.");

  try {
    return tx((db) => {
      const find = db.prepare(
        `SELECT v.name AS vname, p.id AS pid, p.name AS pname, p.price, p.active
         FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?`,
      );
      const take = db.prepare("UPDATE variants SET stock = stock - ? WHERE id = ? AND stock >= ?");
      const items: { pid: number; vid: number; name: string; price: number; qty: number }[] = [];
      let subtotal = 0;

      for (const [variantId, qty] of merged) {
        const row = find.get(variantId) as
          | { vname: string; pid: number; pname: string; price: number; active: number }
          | undefined;
        if (!row || !row.active) throw new OrderError("An item in your cart is no longer available.", "lines");
        const name = `${row.pname} — ${row.vname}`;
        if (take.run(qty, variantId, qty).changes === 0)
          throw new OrderError(`Sorry, ${name} doesn't have enough stock left.`, "lines");
        items.push({ pid: row.pid, vid: variantId, name, price: row.price, qty });
        subtotal += row.price * qty;
      }

      const fee = shippingFee(subtotal, group, getSettings());
      const code = nextOrderCode(db, now);
      const orderId = db
        .prepare(
          `INSERT INTO orders (code, customer_name, mobile, province, city, address, notes, payment_method,
             gcash_ref, shipping_fee, subtotal, total, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
        )
        .run(
          code, customerName, mobile, input.province, input.city, address, input.notes?.trim() ?? "",
          input.paymentMethod, input.paymentMethod === "gcash" ? gcashRef : null,
          fee, subtotal, subtotal + fee, now.toISOString(),
        ).lastInsertRowid;

      const addItem = db.prepare(
        "INSERT INTO order_items (order_id, product_id, variant_id, name_snapshot, price_snapshot, qty) VALUES (?, ?, ?, ?, ?, ?)",
      );
      for (const i of items) addItem.run(orderId, i.pid, i.vid, i.name, i.price, i.qty);
      return { ok: true as const, code };
    });
  } catch (e) {
    if (e instanceof OrderError) return fail(e.field, e.message);
    throw e;
  }
}
