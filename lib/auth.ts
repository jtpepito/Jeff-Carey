// Web Crypto only, so this runs both in middleware and in server actions.
export const SESSION_COOKIE = "jc_admin";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const enc = new TextEncoder();

async function hmacHex(key: string, message: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compares without leaking where the strings differ. */
export function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The key that signs session cookies: SESSION_SECRET mixed with the password, so changing either signs
 * everyone out. Without SESSION_SECRET the password alone is the key, which lets anyone test password
 * guesses by sending made-up cookies; the server warns about that at start-up.
 */
async function sessionKey(password: string, secret: string | undefined): Promise<string> {
  const s = secret?.trim();
  return s ? hmacHex(s, "session-key:" + password) : password;
}

/** Token is `<expiresAtMs>.<hmac>`. */
export async function createSession(
  password: string, now: number = Date.now(), secret: string | undefined = process.env.SESSION_SECRET,
): Promise<string> {
  const exp = String(now + SESSION_TTL_MS);
  return `${exp}.${await hmacHex(await sessionKey(password, secret), "admin-session:" + exp)}`;
}

export async function verifySession(
  token: string | undefined, password: string | undefined, now: number = Date.now(),
  secret: string | undefined = process.env.SESSION_SECRET,
): Promise<boolean> {
  if (!token || !password) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^\d+$/.test(parts[0])) return false;
  if (Number(parts[0]) <= now) return false;
  return sameString(parts[1], await hmacHex(await sessionKey(password, secret), "admin-session:" + parts[0]));
}

/** What a locked-out address is told. */
export function lockoutMessage(waitMs: number): string {
  const minutes = Math.max(1, Math.ceil(waitMs / 60_000));
  return `Too many wrong passwords. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
}

export async function passwordMatches(input: string, password: string | undefined): Promise<boolean> {
  if (!password) return false;
  // HMAC both sides so the comparison is over equal-length digests.
  return sameString(await hmacHex(password, "login:" + input), await hmacHex(password, "login:" + password));
}
