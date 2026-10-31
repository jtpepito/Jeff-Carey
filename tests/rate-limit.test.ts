import { expect, test } from "vitest";
import { RateLimiter } from "@/lib/rate-limit";

const T0 = 1_800_000_000_000;
const MIN = 60_000;

test("allows up to the limit in a window, then blocks until the window ends", () => {
  const limiter = new RateLimiter(3, 10 * MIN);
  expect(limiter.hit("a", T0)).toEqual({ ok: true, retryAfterMs: 0 });
  expect(limiter.hit("a", T0 + MIN)).toEqual({ ok: true, retryAfterMs: 0 });
  expect(limiter.hit("a", T0 + 2 * MIN)).toEqual({ ok: true, retryAfterMs: 0 });
  expect(limiter.hit("a", T0 + 3 * MIN)).toEqual({ ok: false, retryAfterMs: 7 * MIN });
  expect(limiter.blockedFor("a", T0 + 4 * MIN)).toBe(6 * MIN);
  // The window started at the first hit, so it opens again 10 minutes after that.
  expect(limiter.blockedFor("a", T0 + 10 * MIN)).toBe(0);
  expect(limiter.hit("a", T0 + 10 * MIN)).toEqual({ ok: true, retryAfterMs: 0 });
});

test("keys are independent and a key can be reset", () => {
  const limiter = new RateLimiter(1, MIN);
  limiter.hit("a", T0);
  expect(limiter.hit("b", T0)).toEqual({ ok: true, retryAfterMs: 0 });
  expect(limiter.blockedFor("a", T0)).toBe(MIN);
  limiter.reset("a");
  expect(limiter.blockedFor("a", T0)).toBe(0);
});

test("a key that has not reached the limit is not blocked", () => {
  const limiter = new RateLimiter(5, MIN);
  expect(limiter.blockedFor("new", T0)).toBe(0);
  limiter.hit("new", T0);
  expect(limiter.blockedFor("new", T0)).toBe(0);
});

test("stale entries are dropped so the map cannot grow without bound", () => {
  const limiter = new RateLimiter(1, MIN);
  for (let i = 0; i < 20_000; i++) limiter.hit("k" + i, T0);
  expect(limiter.size).toBe(20_000);
  limiter.hit("late", T0 + 2 * MIN);
  expect(limiter.size).toBe(1);
});
