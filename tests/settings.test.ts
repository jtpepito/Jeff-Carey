import { beforeEach, expect, test } from "vitest";
import { getSettings, updateSettings } from "@/lib/settings";
import { freshDb } from "./helpers";

beforeEach(freshDb);

test("defaults apply on an empty database", () => {
  expect(getSettings()).toEqual({
    freeShippingThreshold: 150000, gcashNumber: "0917 000 0000",
    feeNcr: 8000, feeLuzon: 12000, feeVismin: 16000,
  });
});

test("updateSettings persists only the given keys", () => {
  updateSettings({ feeNcr: 9900, gcashNumber: "0998 111 2222" });
  expect(getSettings()).toMatchObject({ feeNcr: 9900, gcashNumber: "0998 111 2222", feeLuzon: 12000 });
});
