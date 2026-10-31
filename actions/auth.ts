"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, lockoutMessage, passwordMatches, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth";
import { clientIp } from "@/lib/client-ip";
import { loginLimiter } from "@/lib/rate-limit";

export async function login(_: unknown, formData: FormData): Promise<{ error: string }> {
  const password = process.env.ADMIN_PASSWORD;
  const input = String(formData.get("password") ?? "");
  const ip = await clientIp();
  const wait = loginLimiter.blockedFor(ip);
  if (wait > 0) return { error: lockoutMessage(wait) };
  if (!(await passwordMatches(input, password))) {
    loginLimiter.hit(ip);
    // Slows down password guessing a little.
    await new Promise((r) => setTimeout(r, 500));
    return { error: password ? "Wrong password." : "ADMIN_PASSWORD is not set on the server, so nobody can sign in." };
  }
  loginLimiter.reset(ip);
  (await cookies()).set(SESSION_COOKIE, await createSession(password!), {
    httpOnly: true,
    sameSite: "lax",
    // INSECURE_COOKIES lets the e2e servers, which run over plain http, keep the cookie.
    secure: process.env.NODE_ENV === "production" && !process.env.INSECURE_COOKIES,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}
