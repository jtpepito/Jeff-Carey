import Link from "next/link";
import { EmptyState } from "@/components/store/empty-state";
import { ProductCard } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { brand } from "@/lib/brand";
import { formatPeso } from "@/lib/money";
import { listCategories, listProducts } from "@/lib/products";

export default function HomePage() {
  const products = listProducts();
  const featured = products.filter((p) => p.featured);
  const hero = featured[0] ?? products[0];

  if (!hero) {
    return (
      <section className="container-page py-16 text-center">
        <p className="eyebrow">{brand.name}</p>
        <h1 className="mx-auto mt-3 max-w-xl text-4xl leading-tight sm:text-5xl">{brand.heroHeadline}</h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">{brand.tagline}</p>
        <div className="mt-10">
          <EmptyState title="Products coming soon" body="We're stocking the shelves. Check back in a little while." />
        </div>
      </section>
    );
  }

  const categories = listCategories().map((name) => ({ name, cover: products.find((p) => p.category === name)! }));
  const bestSellers = featured.length > 0 ? featured : products.slice(0, 4);

  return (
    <>
      <section className="container-page grid gap-8 pt-6 pb-4 md:grid-cols-2 md:items-center md:gap-12 md:pt-12">
        <div className="md:order-1">
          <p className="eyebrow">Small-batch · Philippine-grown</p>
          <h1 className="mt-3 text-[2.5rem] leading-[1.05] sm:text-6xl">{brand.heroHeadline}</h1>
          <p className="mt-4 max-w-md text-[17px] leading-relaxed text-muted-foreground">{brand.promise}</p>
          <div className="mt-6 hidden md:block">
            <Link href={`/product/${hero.slug}`} className="btn btn-primary">
              Shop now
            </Link>
          </div>
        </div>
        <Link href={`/product/${hero.slug}`} className="group relative block md:order-2" aria-label={`Shop now: ${hero.name}`}>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-muted md:aspect-[5/6]">
            <ProductImage src={hero.images[0]} alt={hero.name} sizes="(min-width: 768px) 50vw, 88vw" priority quality={60} />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-20 text-white">
              <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-90">This week&apos;s pick</p>
              <div className="mt-1 flex items-end justify-between gap-4">
                <div>
                  <p className="font-heading text-2xl">{hero.name}</p>
                  <p className="text-[15px]">
                    {formatPeso(hero.price)}
                    {hero.compareAt ? <s className="ml-2 opacity-75">{formatPeso(hero.compareAt)}</s> : null}
                  </p>
                </div>
                <span className="btn btn-light shrink-0 md:hidden">Shop now</span>
              </div>
            </div>
          </div>
        </Link>
      </section>

      <section className="pt-14" aria-labelledby="best-sellers">
        <div className="container-page flex items-end justify-between">
          <h2 id="best-sellers" className="text-3xl">Best sellers</h2>
          <Link href="/shop" className="inline-flex min-h-11 items-center text-[15px] font-semibold underline underline-offset-4">
            See all
          </Link>
        </div>
        <div className="scroll-row mt-5 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:scroll-px-6 sm:px-6 md:mx-auto md:max-w-6xl md:grid md:grid-cols-4 md:overflow-visible">
          {bestSellers.map((p) => (
            <div key={p.id} className="w-[62%] shrink-0 snap-start sm:w-[40%] md:w-auto">
              <ProductCard product={p} sizes="(min-width: 768px) 25vw, 62vw" />
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pt-16" aria-labelledby="categories">
        <h2 id="categories" className="text-3xl">Shop by shelf</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.name}
              href={`/shop?category=${encodeURIComponent(c.name)}`}
              className="group relative block aspect-[16/10] overflow-hidden rounded-3xl bg-muted sm:aspect-[4/5]"
            >
              <ProductImage
                src={c.cover.images[1] ?? c.cover.images[0]}
                alt=""
                sizes="(min-width: 640px) 33vw, 100vw"
                className="transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <div className="absolute inset-x-5 bottom-5 flex items-center justify-between text-white">
                <span className="font-heading text-2xl">{c.name}</span>
                <span aria-hidden className="text-2xl transition-transform group-hover:translate-x-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16 bg-primary text-primary-foreground" aria-labelledby="story">
        <div className="container-page grid gap-8 py-14 md:grid-cols-2 md:items-center md:gap-14">
          <div className="relative aspect-video overflow-hidden rounded-3xl bg-black/20">
            <ProductImage src={brand.storyImage} alt="Coffee being prepared" sizes="(min-width: 768px) 50vw, 100vw" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#e6cf7a] uppercase">Our story</p>
            <h2 id="story" className="mt-3 text-3xl leading-tight sm:text-4xl">Fourteen farms. No middlemen.</h2>
            <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-primary-foreground/85">
              {brand.story.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pt-16" aria-labelledby="gallery">
        <div className="flex items-end justify-between">
          <h2 id="gallery" className="text-3xl">From our kitchen to yours</h2>
          <p className="text-[15px] font-semibold text-gold-ink">{brand.social}</p>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-6">
          {brand.gallery.map((src, i) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
              <ProductImage src={src} alt={`Customer photo ${i + 1}`} sizes="(min-width: 768px) 16vw, 33vw" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
