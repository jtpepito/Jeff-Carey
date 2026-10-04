import { expect, test } from "vitest";
import { citiesOf, isValidLocation, provinces, regionGroupOf } from "@/lib/ph-locations";
import { shippingFee } from "@/lib/shipping";

const s = { freeShippingThreshold: 150000, gcashNumber: "", feeNcr: 8000, feeLuzon: 12000, feeVismin: 16000, pickupInfo: "" };

test("region groups", () => {
  expect(regionGroupOf("Metro Manila")).toBe("ncr");
  expect(regionGroupOf("Benguet")).toBe("luzon");
  expect(regionGroupOf("Palawan")).toBe("luzon");
  expect(regionGroupOf("Cebu")).toBe("vismin");
  expect(regionGroupOf("Davao del Sur")).toBe("vismin");
  expect(regionGroupOf("Atlantis")).toBeNull();
});

test("every province has cities and pairs validate", () => {
  expect(provinces().length).toBeGreaterThanOrEqual(81);
  for (const p of provinces()) expect(citiesOf(p).length).toBeGreaterThan(0);
  expect(isValidLocation("Metro Manila", "Quezon City")).toBe(true);
  expect(isValidLocation("Cebu", "Quezon City")).toBe(false);
});

test("fee per region group below the threshold", () => {
  expect(shippingFee(50000, "ncr", s)).toBe(8000);
  expect(shippingFee(50000, "luzon", s)).toBe(12000);
  expect(shippingFee(50000, "vismin", s)).toBe(16000);
});

test("free at exactly the threshold, charged one centavo below", () => {
  expect(shippingFee(150000, "vismin", s)).toBe(0);
  expect(shippingFee(149999, "vismin", s)).toBe(16000);
});
