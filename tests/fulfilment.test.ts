import { afterEach, expect, test } from "vitest";
import { pickupOnly } from "@/lib/fulfilment";

afterEach(() => {
  process.env.ALLOW_DELIVERY = "1";
});

test("the shop is pickup-only unless delivery is switched back on for tests", () => {
  process.env.ALLOW_DELIVERY = "";
  expect(pickupOnly()).toBe(true);
  process.env.ALLOW_DELIVERY = "1";
  expect(pickupOnly()).toBe(false);
});
