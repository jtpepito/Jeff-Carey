import { expect, test } from "vitest";
import { formatDateOnly, manilaDate, manilaDayRange, manilaYYMM } from "@/lib/time";

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

test("manilaDate gives the calendar date in Manila, with an optional offset in days", () => {
  // 2026-10-03 20:00 UTC is already 2026-10-04 in Manila
  expect(manilaDate(new Date("2026-10-03T20:00:00Z"))).toBe("2026-10-04");
  expect(manilaDate(new Date("2026-10-03T20:00:00Z"), 2)).toBe("2026-10-06");
  expect(manilaDate(new Date("2026-10-30T20:00:00Z"), 2)).toBe("2026-11-02");
});

test("formatDateOnly reads a YYYY-MM-DD without shifting the day", () => {
  expect(formatDateOnly("2026-10-06")).toBe("Tue, 6 Oct 2026");
});
