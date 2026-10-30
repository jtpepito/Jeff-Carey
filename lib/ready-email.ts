import { brand } from "./brand";
import { getDb } from "./db";
import type { EmailMessage, EmailSender } from "./email";
import { formatPeso } from "./money";
import { getOrder, type Order } from "./orders";
import { getSettings } from "./settings";
import { formatDateOnly } from "./time";

export type { EmailMessage, EmailSender } from "./email";

/** The "your order is ready" email. Plain text, so it reads the same in every mail app. */
export function composeReadyEmail(order: Order, pickupInfo: string): EmailMessage {
  const firstName = order.customerName.trim().split(/\s+/)[0] || "there";
  const lines = order.items.map((i) => `- ${i.name} × ${i.qty}`).join("\n");
  const text = [
    `Hi ${firstName},`,
    "",
    `Good news: your ${brand.name} order ${order.code} is ready for pick-up.`,
    "",
    lines,
    `Total: ${formatPeso(order.total)}`,
    "",
    "Where and when to pick it up:",
    pickupInfo,
    ...(order.preferredDate ? ["", `You asked to collect it on ${formatDateOnly(order.preferredDate)}.`] : []),
    "",
    `Please mention your order code, ${order.code}, when you arrive.`,
    "",
    "Thank you,",
    brand.name,
  ].join("\n");
  return { to: order.email, subject: `Your ${brand.name} order ${order.code} is ready for pick-up`, text };
}

export type ReadyEmailResult = { ok: true; to: string; sentAt: string } | { ok: false; error: string };

/** Emails the customer that their order is ready, and records when. Nothing is recorded if sending fails. */
export async function sendReadyEmail(orderId: number, send: EmailSender, now: Date = new Date()): Promise<ReadyEmailResult> {
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: "This order no longer exists." };
  if (order.status === "cancelled") return { ok: false, error: "This order was cancelled, so no email was sent." };
  if (!order.email) return { ok: false, error: "This order has no email address (it was placed before checkout asked for one)." };

  const result = await send(composeReadyEmail(order, getSettings().pickupInfo));
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "not_configured"
          ? "Email isn't set up yet, so nothing was sent. Add the shop's Gmail address and app password (see the README)."
          : `The email couldn't be sent (${result.reason}). Please try again in a moment.`,
    };
  }
  const sentAt = now.toISOString();
  getDb().prepare("UPDATE orders SET ready_emailed_at = ? WHERE id = ?").run(sentAt, orderId);
  return { ok: true, to: order.email, sentAt };
}
