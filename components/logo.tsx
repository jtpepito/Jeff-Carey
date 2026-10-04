import Image from "next/image";
import { cn } from "@/lib/utils";

/** The J&C monogram as a round badge. Decorative: the brand name is always written next to it. */
export function Logo({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <Image
      // The small file covers badge sizes up to 80px on high-density screens; larger badges use the full crop.
      src={size <= 80 ? "/logo-160.webp" : "/logo.jpg"}
      alt=""
      width={size}
      height={size}
      unoptimized
      className={cn("shrink-0 rounded-full", className)}
    />
  );
}
