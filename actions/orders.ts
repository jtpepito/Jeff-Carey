"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { defaultSender } from "@/lib/email";
import { changeStatus, clearAllOrders, ORDER_STATUSES, setAdminNotes, type OrderStatus } from "@/lib/orders";
import { sendReadyEmail, type ReadyEmailResult } from "@/lib/ready-email";

export async function moveOrder(id: number, to: OrderStatus): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  if (!Number.isInteger(id) || !ORDER_STATUSES.includes(to)) return { ok: false, error: "That status change isn't valid." };
  const result = changeStatus(id, to);
  // Cancelling returns stock, which the storefront shows.
  revalidatePath("/", "layout");
  return result;
}

export async function saveAdminNotes(id: number, notes: string): Promise<void> {
  await requireAdmin();
  if (!Number.isInteger(id)) return;
  setAdminNotes(id, String(notes ?? "").slice(0, 2000));
  revalidatePath("/admin", "layout");
}

/** Emails the customer that their order is ready for pick-up. */
export async function sendReadyEmailAction(id: number): Promise<ReadyEmailResult> {
  await requireAdmin();
  if (!Number.isInteger(id)) return { ok: false, error: "That order isn't valid." };
  const result = await sendReadyEmail(id, defaultSender());
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}

/** Deletes the whole order history. The admin has to type DELETE to confirm. */
export async function clearOrderHistoryAction(confirmation: string): Promise<{ ok: true; orders: number; unitsRestocked: number } | { ok: false; error: string }> {
  await requireAdmin();
  if (String(confirmation ?? "").trim() !== "DELETE") return { ok: false, error: "Type DELETE to confirm." };
  const { orders, unitsRestocked } = clearAllOrders();
  revalidatePath("/", "layout");
  return { ok: true, orders, unitsRestocked };
}
