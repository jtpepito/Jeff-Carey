"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { changeStatus, ORDER_STATUSES, setAdminNotes, type OrderStatus } from "@/lib/orders";

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
