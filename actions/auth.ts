"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, passwordMatches, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth";

export async function login(_: unknown, formData: FormData): Promise<{ error: string }> {
  const password = process.env.ADMIN_PASSWORD;
  const input = String(formData.get("password") ?? "");
  if (!(await passwordMatches(input, password))) {
    // Slows down password guessing a little.
    await new Promise((r) => setTimeout(r, 500));
    return { error: password ? "Wrong password." : "ADMIN_PASSWORD is not set on the server, so nobody can sign in." };
  }
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
