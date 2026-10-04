import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "./auth";

/** Every admin server action calls this first; middleware alone does not protect actions. */
export async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(token, process.env.ADMIN_PASSWORD))) redirect("/admin/login");
}
