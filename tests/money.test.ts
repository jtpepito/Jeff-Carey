import { expect, test } from "vitest";
import { formatPeso, parsePeso } from "@/lib/money";

test("formatPeso drops .00 and groups thousands", () => {
  expect(formatPeso(150000)).toBe("₱1,500");
  expect(formatPeso(149950)).toBe("₱1,499.50");
  expect(formatPeso(0)).toBe("₱0");
});

test("parsePeso accepts commas, peso sign and decimals", () => {
  expect(parsePeso("1,299.50")).toBe(129950);
  expect(parsePeso("₱ 450")).toBe(45000);
  expect(parsePeso("0")).toBe(0);
});

test("parsePeso rejects empty, negative, text and more than 2 decimals", () => {
  for (const bad of ["", "  ", "-5", "abc", "12.345", "1e3"]) expect(parsePeso(bad)).toBeNull();
});
