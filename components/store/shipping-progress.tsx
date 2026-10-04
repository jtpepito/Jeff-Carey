import { formatPeso } from "@/lib/money";

export function ShippingProgress({ subtotal, threshold }: { subtotal: number; threshold: number }) {
  if (threshold <= 0) return null;
  const unlocked = subtotal >= threshold;
  const percent = Math.min(100, Math.round((subtotal / threshold) * 100));
  return (
    <div className="rounded-2xl bg-muted px-4 py-3">
      <p className="text-sm font-semibold">
        {unlocked ? "You've unlocked free shipping" : `${formatPeso(threshold - subtotal)} away from free shipping`}
      </p>
      <div
        role="progressbar"
        aria-label="Progress to free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-2 h-2 overflow-hidden rounded-full bg-background"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
