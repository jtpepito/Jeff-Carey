"use client";

import { cn } from "@/lib/utils";

export function QtyStepper({
  qty, max, onChange, size = "lg", min = 1,
}: { qty: number; max: number; onChange: (qty: number) => void; size?: "sm" | "lg"; min?: number }) {
  const cell = size === "lg" ? "size-12 text-xl" : "size-11 text-lg";
  return (
    <div className="inline-flex items-center rounded-full border border-input bg-card">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={qty <= min}
        onClick={() => onChange(qty - 1)}
        className={cn(cell, "rounded-full disabled:opacity-35")}
      >
        −
      </button>
      <span aria-live="polite" className="min-w-8 text-center text-[15px] font-semibold tabular-nums">{qty}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={qty >= max}
        onClick={() => onChange(qty + 1)}
        className={cn(cell, "rounded-full disabled:opacity-35")}
      >
        +
      </button>
    </div>
  );
}
