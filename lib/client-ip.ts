import { headers } from "next/headers";

/**
 * The address a request came from, for rate limiting. Fly's proxy sets Fly-Client-IP, which a client
 * cannot forge; X-Forwarded-For covers other proxies, and local runs fall back to one shared key.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fly = h.get("fly-client-ip")?.trim();
  if (fly) return fly;
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "local";
}
