"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProductImage } from "./product-image";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted">
        <ProductImage src={images[index]} alt={name} sizes="(min-width: 768px) 50vw, 100vw" priority />
      </div>
      {images.length > 1 ? (
        <div className="mt-3 flex gap-3">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1} of ${images.length}`}
              aria-current={i === index}
              className={cn(
                "relative size-16 overflow-hidden rounded-xl bg-muted ring-offset-2 ring-offset-background",
                i === index ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100",
              )}
            >
              <ProductImage src={src} alt="" sizes="64px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
