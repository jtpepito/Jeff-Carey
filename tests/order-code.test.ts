import { beforeEach, expect, test } from "vitest";
import { getDb } from "@/lib/db";
import { nextOrderCode } from "@/lib/order-code";
import { freshDb } from "./helpers";

beforeEach(freshDb);

function insertCode(code: string) {
  getDb().prepare(
    `INSERT INTO orders (code, customer_name, mobile, province, city, address, payment_method,
     shipping_fee, subtotal, total, created_at) VALUES (?, 'x','x','x','x','x','cod',0,0,0,'2026-10-01T00:00:00.000Z')`,
  ).run(code);
}

test("first code of a month is 0001", () => {
  expect(nextOrderCode(getDb(), new Date("2026-10-04T03:00:00Z"))).toBe("JC-2610-0001");
});

test("continues from the highest number in the month and restarts next month", () => {
  insertCode("JC-2610-0001"); insertCode("JC-2610-0007");
  expect(nextOrderCode(getDb(), new Date("2026-10-04T03:00:00Z"))).toBe("JC-2610-0008");
  expect(nextOrderCode(getDb(), new Date("2026-11-02T03:00:00Z"))).toBe("JC-2611-0001");
});

test("counts numerically past 9999", () => {
  insertCode("JC-2610-9999"); insertCode("JC-2610-10000");
  expect(nextOrderCode(getDb(), new Date("2026-10-04T03:00:00Z"))).toBe("JC-2610-10001");
});
