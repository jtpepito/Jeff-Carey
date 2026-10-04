import Link from "next/link";
import { brand } from "@/lib/brand";

export function Header({ cart }: { cart?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="font-heading text-[22px] font-semibold tracking-tight">
          {brand.name}
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/shop" className="inline-flex h-11 items-center rounded-full px-4 text-[15px] font-medium hover:bg-foreground/5">
            Shop
          </Link>
          {cart}
        </nav>
      </div>
    </header>
  );
}
