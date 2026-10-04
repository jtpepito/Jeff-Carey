import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/actions/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { Toaster } from "@/components/ui/sonner";
import { brand } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Admin", template: `%s | ${brand.name} admin` }, robots: { index: false } };

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="container-page flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4">
            <p className="font-heading text-xl font-semibold">{brand.name} <span className="font-sans text-sm font-normal text-muted-foreground">admin</span></p>
            <div className="flex items-center gap-1 sm:hidden">
              <ConsoleLinks />
            </div>
          </div>
          <AdminNav />
          <div className="hidden items-center gap-1 sm:flex">
            <ConsoleLinks />
          </div>
        </div>
      </header>
      <main className="container-page py-8">{children}</main>
      <Toaster position="top-center" theme="light" />
    </>
  );
}

function ConsoleLinks() {
  return (
    <>
      <Link href="/" className="inline-flex h-11 items-center rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-foreground/5">
        View store
      </Link>
      <form action={logout}>
        <button type="submit" className="inline-flex h-11 items-center rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-foreground/5">
          Sign out
        </button>
      </form>
    </>
  );
}
