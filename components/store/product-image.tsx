import Image from "next/image";
import { cn } from "@/lib/utils";

const OPTIMISED_HOST = "https://images.unsplash.com/";

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
      // Hosts other than Unsplash are not in next.config's allow-list, so serve them as-is.
      unoptimized={!src.startsWith(OPTIMISED_HOST)}
      className={cn("object-cover", className)}
    />
  );
}
