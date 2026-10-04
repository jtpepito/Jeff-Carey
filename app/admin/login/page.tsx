import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/logo";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-7">
        <Logo size={64} />
        <p className="eyebrow mt-4">{brand.name}</p>
        <h1 className="mt-2 text-3xl">Order console</h1>
        <LoginForm />
      </div>
    </main>
  );
}
