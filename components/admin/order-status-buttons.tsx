"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { moveOrder } from "@/actions/orders";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { OrderStatus } from "@/lib/orders";

const LABELS: Partial<Record<OrderStatus, string>> = {
  confirmed: "Mark confirmed",
  shipped: "Mark shipped",
  delivered: "Mark delivered",
};

export function OrderStatusButtons({ orderId, next }: { orderId: number; next: OrderStatus[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function move(to: OrderStatus) {
    startTransition(async () => {
      const result = await moveOrder(orderId, to);
      setConfirming(false);
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }

  if (next.length === 0) return <p className="text-[15px] text-muted-foreground">This order is closed. No further steps.</p>;

  return (
    <div className="flex flex-wrap gap-3">
      {next.filter((s) => s !== "cancelled").map((s) => (
        <button key={s} type="button" disabled={pending} onClick={() => move(s)} className="btn btn-primary">
          {LABELS[s]}
        </button>
      ))}
      {next.includes("cancelled") ? (
        <button type="button" disabled={pending} onClick={() => setConfirming(true)} className="btn btn-outline">
          Cancel order
        </button>
      ) : null}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Cancel this order?</DialogTitle>
            <DialogDescription>
              The items go back into stock and the order is closed for good. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setConfirming(false)} className="btn btn-outline">
              Keep it
            </button>
            <button type="button" disabled={pending} onClick={() => move("cancelled")} className="btn btn-danger">
              Yes, cancel and restock
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
