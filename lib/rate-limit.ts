/**
 * A small in-memory rate limiter: at most `max` hits per key in a window that starts at the key's first hit.
 * The shop runs on one machine, so one process seeing every request is enough; the counts reset on restart.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly max: number, private readonly windowMs: number) {}

  /** Records a hit and says whether it was within the limit; if not, how long until the window opens again. */
  hit(key: string, now: number = Date.now()): { ok: boolean; retryAfterMs: number } {
    this.prune(now);
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return { ok: true, retryAfterMs: 0 };
    }
    entry.count++;
    return entry.count <= this.max ? { ok: true, retryAfterMs: 0 } : { ok: false, retryAfterMs: entry.resetAt - now };
  }

  /** How long a key that has used up its limit must wait, or 0 if it may go ahead. */
  blockedFor(key: string, now: number = Date.now()): number {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now || entry.count < this.max) return 0;
    return entry.resetAt - now;
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  get size(): number {
    return this.hits.size;
  }

  /** Drops expired entries now and then, so a flood of one-off keys does not stay in memory. */
  private prune(now: number) {
    if (this.hits.size < 10_000) return;
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
  }
}

const MINUTE = 60_000;

/** Wrong admin passwords allowed per address before it is locked out for the rest of the window. */
export const LOGIN_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * MINUTE;
/** Checkout submissions allowed per address per hour (failed attempts count too). */
export const CHECKOUT_ATTEMPTS = 30;
export const CHECKOUT_WINDOW_MS = 60 * MINUTE;

// Kept on globalThis so a dev-server reload does not start the counts over.
const g = globalThis as unknown as { __jcLoginLimiter?: RateLimiter; __jcCheckoutLimiter?: RateLimiter };
export const loginLimiter = (g.__jcLoginLimiter ??= new RateLimiter(LOGIN_ATTEMPTS, LOGIN_WINDOW_MS));
export const checkoutLimiter = (g.__jcCheckoutLimiter ??= new RateLimiter(CHECKOUT_ATTEMPTS, CHECKOUT_WINDOW_MS));
