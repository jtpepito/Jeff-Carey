import { expect, test } from "vitest";
import { createSession, lockoutMessage, passwordMatches, SESSION_TTL_MS, verifySession } from "@/lib/auth";

const T0 = 1_800_000_000_000;

test("a fresh session verifies with the same password", async () => {
  expect(await verifySession(await createSession("secret", T0), "secret", T0 + 1000)).toBe(true);
});

test("expired, tampered, wrong-password and malformed tokens fail", async () => {
  const token = await createSession("secret", T0);
  const [exp, sig] = token.split(".");
  expect(await verifySession(token, "secret", T0 + SESSION_TTL_MS + 1)).toBe(false);
  expect(await verifySession(`${Number(exp) + 99999}.${sig}`, "secret", T0)).toBe(false);
  expect(await verifySession(token, "other", T0)).toBe(false);
  for (const bad of [undefined, "", "abc", "1.2.3", `${exp}.zz`]) expect(await verifySession(bad, "secret", T0)).toBe(false);
});

test("an unset or empty ADMIN_PASSWORD never authenticates", async () => {
  const token = await createSession("x", T0);
  expect(await verifySession(token, "", T0)).toBe(false);
  expect(await verifySession(token, undefined, T0)).toBe(false);
  expect(await passwordMatches("", "")).toBe(false);
  expect(await passwordMatches("x", undefined)).toBe(false);
});

test("passwordMatches", async () => {
  expect(await passwordMatches("secret", "secret")).toBe(true);
  expect(await passwordMatches("Secret", "secret")).toBe(false);
});

test("with SESSION_SECRET set, the cookie key is the secret mixed with the password", async () => {
  const token = await createSession("secret", T0, "server-secret");
  expect(await verifySession(token, "secret", T0, "server-secret")).toBe(true);
  // Someone who guesses the password still cannot forge a cookie without the server secret...
  expect(await verifySession(token, "secret", T0, "other-secret")).toBe(false);
  expect(await verifySession(token, "secret", T0, undefined)).toBe(false);
  expect(await verifySession(await createSession("secret", T0, undefined), "secret", T0, "server-secret")).toBe(false);
  // ...and changing the password still signs everyone out.
  expect(await verifySession(token, "new-password", T0, "server-secret")).toBe(false);
});

test("the login error for a locked-out address says how long to wait", () => {
  expect(lockoutMessage(15 * 60_000)).toBe("Too many wrong passwords. Try again in 15 minutes.");
  expect(lockoutMessage(61_000)).toBe("Too many wrong passwords. Try again in 2 minutes.");
  expect(lockoutMessage(10_000)).toBe("Too many wrong passwords. Try again in 1 minute.");
});
