import { expect, test } from "vitest";
import { deliversTo, deliveryGroups, deliveryProvinces } from "@/lib/delivery";

test("delivery is limited to Cebu", () => {
  expect(deliveryProvinces()).toEqual(["Cebu"]);
  expect(deliversTo("Cebu")).toBe(true);
  expect(deliversTo("Metro Manila")).toBe(false);
  expect(deliversTo("Atlantis")).toBe(false);
  expect(deliveryGroups()).toEqual(["vismin"]);
});
