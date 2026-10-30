import { beforeEach, expect, test } from "vitest";
import { changeStatus, getOrder, getOrderByCode, placeOrder } from "@/lib/orders";
import { composeReadyEmail, sendReadyEmail, type EmailMessage, type EmailSender } from "@/lib/ready-email";
import { updateSettings } from "@/lib/settings";
import { ids, NOW, order, setupShop } from "./order-fixtures";

beforeEach(setupShop);

const place = (over = {}) => getOrderByCode((placeOrder(order(over), NOW) as { ok: true; code: string }).code)!.id;

function recorder(result: { ok: true } | { ok: false; reason: string } = { ok: true }) {
  const sent: EmailMessage[] = [];
  const send: EmailSender = async (m) => {
    sent.push(m);
    return result;
  };
  return { sent, send };
}

test("the email names the order, what was ordered, the total and where to pick it up", () => {
  updateSettings({ pickupInfo: "Unit 2, 14 Sample St, Lahug. 10am to 6pm." });
  const o = getOrder(place({ customerName: "Ana Reyes", fulfilment: "pickup", lines: [{ variantId: ids.v250, qty: 2 }], preferredDate: "2026-10-09" }))!;
  const m = composeReadyEmail(o, "Unit 2, 14 Sample St, Lahug. 10am to 6pm.");
  expect(m.to).toBe("ana@example.com");
  expect(m.subject).toBe(`Your Jef&Carey order ${o.code} is ready for pick-up`);
  expect(m.text).toContain("Hi Ana,");
  expect(m.text).toContain("Benguet Arabica — 250g × 2");
  expect(m.text).toContain("Total: ₱1,000");
  expect(m.text).toContain("Unit 2, 14 Sample St, Lahug. 10am to 6pm.");
  expect(m.text).toContain(o.code);
});

test("sending records the time, and the order shows it", async () => {
  const id = place();
  const { sent, send } = recorder();
  const at = new Date("2026-10-08T02:00:00Z");
  expect(await sendReadyEmail(id, send, at)).toEqual({ ok: true, to: "ana@example.com", sentAt: at.toISOString() });
  expect(sent).toHaveLength(1);
  expect(getOrder(id)!.readyEmailedAt).toBe(at.toISOString());
});

test("a failed send says why and records nothing", async () => {
  const id = place();
  const { send } = recorder({ ok: false, reason: "not_configured" });
  expect(await sendReadyEmail(id, send)).toMatchObject({ ok: false, error: expect.stringMatching(/isn't set up/) });
  expect(getOrder(id)!.readyEmailedAt).toBeNull();
  const failing = recorder({ ok: false, reason: "auth failed" });
  expect(await sendReadyEmail(id, failing.send)).toMatchObject({ ok: false, error: expect.stringMatching(/couldn't be sent/) });
});

test("no email for cancelled orders, unknown orders, or orders placed before email was asked for", async () => {
  const { sent, send } = recorder();
  const cancelled = place();
  changeStatus(cancelled, "cancelled");
  expect(await sendReadyEmail(cancelled, send)).toMatchObject({ ok: false });
  expect(await sendReadyEmail(999999, send)).toMatchObject({ ok: false });
  const old = place();
  const { getDb } = await import("@/lib/db");
  getDb().prepare("UPDATE orders SET email = '' WHERE id = ?").run(old);
  expect(await sendReadyEmail(old, send)).toMatchObject({ ok: false, error: expect.stringMatching(/no email/i) });
  expect(sent).toHaveLength(0);
});
