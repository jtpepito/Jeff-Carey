import Link from "next/link";
import { Logo } from "@/components/logo";
import { brand } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="mt-20 bg-olive-deep text-[#f3eadb]">
      <div className="container-page grid gap-12 py-14 md:grid-cols-[1fr_1.4fr]">
        <div>
          <Logo size={96} />
          <p className="mt-4 font-heading text-2xl font-semibold">{brand.name}</p>
          <p className="mt-3 max-w-sm text-[15px] text-[#d9cbb6]">{brand.tagline}</p>
          <p className="mt-6 text-[15px] text-[#d9cbb6]">{brand.promise}</p>
          <Link href="/shop" className="btn btn-light mt-6">
            Shop everything
          </Link>
        </div>
        <div>
          <h2 className="text-xl">Questions, answered</h2>
          {/* Native <details> keeps the FAQ interactive with no JavaScript. */}
          <div className="mt-4 divide-y divide-white/15 border-y border-white/15">
            {brand.faqs.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="text-xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-4 text-[15px] leading-relaxed text-[#d9cbb6]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="container-page flex flex-col gap-1 py-5 text-sm text-[#bfb09a] sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {brand.name}. Cash on delivery and GCash accepted.</p>
          <p>{brand.social}</p>
        </div>
      </div>
    </footer>
  );
}
