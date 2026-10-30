import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { getPaymentProof } from "@/lib/orders";

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "application/pdf": "pdf",
};

/** The customer's receipt for one order. Admin only; never cached; served with the type it was checked to be. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(token, process.env.ADMIN_PASSWORD))) return new Response("Not signed in", { status: 401 });

  const id = Number((await params).id);
  const proof = getPaymentProof(id);
  if (!proof) return new Response("No receipt for this order", { status: 404 });

  const name = `order-${id}-receipt.${EXTENSION[proof.mime] ?? "bin"}`;
  return new Response(Buffer.from(proof.data), {
    headers: {
      "Content-Type": proof.mime,
      "Content-Length": String(proof.size),
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // A receipt is only ever looked at, never run.
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
