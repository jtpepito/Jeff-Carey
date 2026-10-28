import Image from "next/image";
import { cn } from "@/lib/utils";

/** Next can resize local files and the Unsplash host from next.config; anything else is served as-is. */
export const canOptimise = (src: string) => src.startsWith("/") || src.startsWith("https://images.unsplash.com/");

/** Fills its parent, which must be `relative` with a fixed aspect ratio so the page never shifts. */
export function ProductImage({
  src, alt, sizes, priority = false, quality, className,
}: { src: string | null | undefined; alt: string; sizes: string; priority?: boolean; quality?: number; className?: string }) {
  if (!src) return <div aria-hidden className={cn("absolute inset-0 bg-muted", className)} />;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={quality}
      unoptimized={!canOptimise(src)}
      className={cn("object-cover", className)}
    />
  );
}
