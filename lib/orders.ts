import { getDb, tx } from "./db";
import { deliversTo, deliveryProvinces } from "./delivery";
import { pickupOnly } from "./fulfilment";
import { detectProofType, MAX_PROOF_BYTES, type CheckoutPayment, type PaymentMethod } from "./payment";
import { nextOrderCode } from "./order-code";
import { isValidLocation, regionGroupOf } from "./ph-locations";
import { getSettings } from "./settings";
import { shippingFee } from "./shipping";
import { manilaDate, manilaDayRange } from "./time";

export type Fulfilment = "delivery" | "pickup";

export type OrderInput = {
  customerName: string; mobile: string; province: string; city: string; address: string;
  notes?: string; paymentMethod: CheckoutPayment;
  /** Optional reference number from the bank or GCash receipt. */
  gcashRef?: string;
  /** The receipt the customer uploads: a photo or PDF of the transfer. */
  proof?: { name: string; data: Uint8Array };
  lines: { variantId: number; qty: number }[];
  /** Defaults to delivery. Pickup needs no address and has no delivery fee. */
  fulfilment?: Fulfilment;
  /** YYYY-MM-DD, the day the customer wants it delivered or will pick it up. */
  preferredDate?: string;
  /** Made up once by the checkout page. A retry with the same id returns the first order. */
  requestId?: string;
};
/** Orders are baked to order, so the earliest date is this many days out; and no further than the max. */
export const MIN_LEAD_DAYS = 2;
export const MAX_LEAD_DAYS = 60;

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
  const fulfilment = input.fulfilment ?? (pickupOnly() ? "pickup" : "delivery");
  const pickup = fulfilment === "pickup";
  const address = pickup ? "" : (input.address?.trim() ?? "");
  const gcashRef = input.gcashRef?.trim() ?? "";

  if (!customerName) return fail("customerName", "Enter your name.");
  if (!/^09\d{9}$/.test(mobile)) return fail("mobile", "Enter an 11-digit mobile number starting with 09.");
  if (fulfilment !== "delivery" && fulfilment !== "pickup") return fail("fulfilment", "Choose delivery or pickup.");
  if (fulfilment === "delivery" && pickupOnly()) return fail("fulfilment", "All orders are for pick-up at the moment.");
  const group = pickup ? null : regionGroupOf(input.province);
  if (!pickup) {
    if (!group) return fail("province", "Choose a province.");
    if (!deliversTo(input.province)) return fail("province", `Sorry, we only deliver within ${deliveryProvinces().join(", ")}.`);
    if (!isValidLocation(input.province, input.city)) return fail("city", "Choose a city or municipality.");
    if (!address) return fail("address", "Enter your street address.");
  }
  if (input.paymentMethod !== "bank" && input.paymentMethod !== "gcash")
    return fail("paymentMethod", "Choose bank transfer or GCash.");
  const proofData = input.proof?.data;
  if (!proofData || proofData.length === 0) return fail("proof", "Attach a screenshot or photo of your payment so we can verify it.");
  if (proofData.length > MAX_PROOF_BYTES) return fail("proof", "That file is over 5 MB. Please attach a smaller screenshot or photo.");
  const proofMime = detectProofType(proofData);
  if (!proofMime) return fail("proof", "Please attach a photo (JPG, PNG, WebP or HEIC) or a PDF of your receipt.");
  const proofName = (input.proof?.name ?? "").trim().slice(0, 120) || "receipt";
  const preferredDate = (input.preferredDate ?? "").trim();
  const earliest = manilaDate(now, MIN_LEAD_DAYS);
  const latest = manilaDate(now, MAX_LEAD_DAYS);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || Number.isNaN(Date.parse(preferredDate + "T12:00:00+08:00")))
    return fail("preferredDate", `Choose the day you want it ${pickup ? "picked up" : "delivered"}.`);
  if (preferredDate < earliest) return fail("preferredDate", `We bake to order, so please choose a date at least ${MIN_LEAD_DAYS} days from today.`);
  if (preferredDate > latest) return fail("preferredDate", `Please choose a date within the next ${MAX_LEAD_DAYS} days.`);

  const merged = new Map<number, number>();
  for (const l of Array.isArray(input.lines) ? input.lines : []) {
    if (!Number.isInteger(l?.variantId) || !Number.isInteger(l?.qty) || l.qty < 1 || l.qty > MAX_QTY_PER_LINE)
      return fail("lines", "One of the quantities in your cart is not valid.");
    merged.set(l.variantId, (merged.get(l.variantId) ?? 0) + l.qty);
  }
  if (merged.size === 0) return fail("lines", "Your cart is empty.");

  try {
    return tx((db) => {
      const requestId = input.requestId?.trim() || null;
      if (requestId) {
        // The shopper's first attempt may have succeeded even though the reply never reached them.
        const earlier = db.prepare("SELECT code FROM orders WHERE request_id = ?").get(requestId) as { code: string } | undefined;
        if (earlier) return { ok: true as const, code: earlier.code };
      }
      const find = db.prepare(
        `SELECT v.name AS vname, p.id AS pid, p.name AS pname, COALESCE(v.price, p.price) AS price, p.active
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

      const fee = group ? shippingFee(subtotal, group, getSettings()) : 0;
      const code = nextOrderCode(db, now);
      const orderId = db
        .prepare(
          `INSERT INTO orders (code, customer_name, mobile, province, city, address, notes, payment_method,
             gcash_ref, shipping_fee, subtotal, total, status, created_at, request_id, fulfilment, preferred_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?)`,
        )
        .run(
          code, customerName, mobile, pickup ? "" : input.province, pickup ? "" : input.city, address, input.notes?.trim() ?? "",
          input.paymentMethod, gcashRef || null,
          fee, subtotal, subtotal + fee, now.toISOString(), requestId, fulfilment, preferredDate,
        ).lastInsertRowid;

      const addItem = db.prepare(
        "INSERT INTO order_items (order_id, product_id, variant_id, name_snapshot, price_snapshot, qty) VALUES (?, ?, ?, ?, ?, ?)",
      );
      for (const i of items) addItem.run(orderId, i.pid, i.vid, i.name, i.price, i.qty);
      db.prepare("INSERT INTO payment_proofs (order_id, file_name, mime, size, data, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(orderId, proofName, proofMime, proofData.length, proofData, now.toISOString());
      return { ok: true as const, code };
    });
  } catch (e) {
    if (e instanceof OrderError) return fail(e.field, e.message);
    throw e;
  }
}

export type OrderStatus = "new" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type OrderItem = { id: number; productId: number; variantId: number; name: string; price: number; qty: number };
export type Order = {
  id: number; code: string; customerName: string; mobile: string; province: string; city: string;
  address: string; notes: string; adminNotes: string; paymentMethod: PaymentMethod; gcashRef: string | null;
  shippingFee: number; subtotal: number; total: number; status: OrderStatus; createdAt: string; fulfilment: Fulfilment; preferredDate: string | null; items: OrderItem[];
  /** The customer's receipt, if one was uploaded (orders paid in cash before have none). */
  proof: { fileName: string; mime: string; size: number } | null;
};
export type OrderSummary = Omit<Order, "items">;

export const ORDER_STATUSES: OrderStatus[] = ["new", "confirmed", "shipped", "delivered", "cancelled"];

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function nextStatuses(s: OrderStatus): OrderStatus[] {
  return NEXT[s] ?? [];
}

const ORDER_COLUMNS = `id, code, customer_name AS customerName, mobile, province, city, address, notes,
  admin_notes AS adminNotes, payment_method AS paymentMethod, gcash_ref AS gcashRef,
  shipping_fee AS shippingFee, subtotal, total, status, created_at AS createdAt, fulfilment, preferred_date AS preferredDate`;

function withItems(row: OrderSummary | undefined): Order | null {
  if (!row) return null;
  const items = getDb()
    .prepare(
      `SELECT id, product_id AS productId, variant_id AS variantId, name_snapshot AS name,
              price_snapshot AS price, qty FROM order_items WHERE order_id = ? ORDER BY id`,
    )
    .all(row.id) as OrderItem[];
  const proof = getDb()
    .prepare("SELECT file_name AS fileName, mime, size FROM payment_proofs WHERE order_id = ?")
    .get(row.id) as { fileName: string; mime: string; size: number } | undefined;
  return { ...row, items, proof: proof ? { ...proof } : null };
}

export function getOrder(id: number): Order | null {
  if (!Number.isInteger(id)) return null;
  return withItems(getDb().prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = ?`).get(id) as OrderSummary | undefined);
}

export function getOrderByCode(code: string): Order | null {
  return withItems(getDb().prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE code = ?`).get(code) as OrderSummary | undefined);
}

export function listOrders(opts: { status?: OrderStatus } = {}): OrderSummary[] {
  const byStatus = opts.status && ORDER_STATUSES.includes(opts.status);
  const sql = `SELECT ${ORDER_COLUMNS} FROM orders ${byStatus ? "WHERE status = ?" : ""} ORDER BY created_at DESC, id DESC`;
  return (byStatus ? getDb().prepare(sql).all(opts.status!) : getDb().prepare(sql).all()) as OrderSummary[];
}

/** Moves an order along the status flow. Cancelling returns each item's qty to its variant. */
export function changeStatus(id: number, to: OrderStatus): { ok: true } | { ok: false; error: string } {
  return tx((db) => {
    const row = db.prepare("SELECT status FROM orders WHERE id = ?").get(id) as { status: OrderStatus } | undefined;
    if (!row) return { ok: false as const, error: "This order no longer exists." };
    if (!nextStatuses(row.status).includes(to))
      return { ok: false as const, error: `This order can't move from ${row.status} to ${to}.` };
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(to, id);
    if (to === "cancelled") {
      const restock = db.prepare("UPDATE variants SET stock = stock + ? WHERE id = ?");
      const items = db.prepare("SELECT variant_id, qty FROM order_items WHERE order_id = ?").all(id) as {
        variant_id: number; qty: number;
      }[];
      for (const i of items) restock.run(i.qty, i.variant_id);
    }
    return { ok: true as const };
  });
}

export function setAdminNotes(id: number, notes: string): void {
  getDb().prepare("UPDATE orders SET admin_notes = ? WHERE id = ?").run(notes.trim(), id);
}

export function dashboardStats(now: Date = new Date()) {
  const { start, end } = manilaDayRange(now);
  const todayOrders = getDb()
    .prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE created_at >= ? AND created_at < ? ORDER BY created_at DESC, id DESC`)
    .all(start, end) as OrderSummary[];
  const todayRevenue = todayOrders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.total, 0);
  const pendingCount = (getDb().prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'new'").get() as { c: number }).c;
  return { todayOrders, todayRevenue, pendingCount };
}

/** The receipt file for an order, for the admin to view. */
export function getPaymentProof(orderId: number): { fileName: string; mime: string; size: number; data: Uint8Array } | null {
  if (!Number.isInteger(orderId)) return null;
  const row = getDb()
    .prepare("SELECT file_name AS fileName, mime, size, data FROM payment_proofs WHERE order_id = ?")
    .get(orderId) as { fileName: string; mime: string; size: number; data: Uint8Array } | undefined;
  return row ? { ...row } : null;
}
