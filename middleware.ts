import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export const config = { matcher: ["/admin/:path*"] };

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();
  const ok = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, process.env.ADMIN_PASSWORD);
  return ok ? NextResponse.next() : NextResponse.redirect(new URL("/admin/login", req.url));
}
