import { expect, test } from "vitest";
import { manilaDayRange, manilaYYMM } from "@/lib/time";

test("month rolls over at Manila midnight, not UTC midnight", () => {
  // 2026-09-30 16:30 UTC is 2026-10-01 00:30 in Manila
  expect(manilaYYMM(new Date("2026-09-30T16:30:00Z"))).toBe("2610");
  expect(manilaYYMM(new Date("2026-09-30T15:30:00Z"))).toBe("2609");
});

test("day range is the Manila calendar day in UTC", () => {
  expect(manilaDayRange(new Date("2026-10-04T03:00:00Z"))).toEqual({
    start: "2026-10-03T16:00:00.000Z",
    end: "2026-10-04T16:00:00.000Z",
  });
});
