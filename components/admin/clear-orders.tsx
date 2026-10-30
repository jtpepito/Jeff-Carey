"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { clearOrderHistoryAction } from "@/actions/orders";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Deletes every order after the admin types DELETE. Stock held by open orders goes back on the shelf. */
export function ClearOrders({ count }: { count: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function clear() {
    setError(null);
    startTransition(async () => {
      const result = await clearOrderHistoryAction(typed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setTyped("");
      toast.success(`Deleted ${result.orders} ${result.orders === 1 ? "order" : "orders"}; ${result.unitsRestocked} units back in stock`);
      router.refresh();
    });
  }

  return (
    <section className="mt-12 rounded-2xl border border-destructive/30 bg-card p-5" aria-labelledby="clear-heading">
      <h2 id="clear-heading" className="text-xl">Clear order history</h2>
      <p className="mt-1 text-[15px] text-muted-foreground">
        Deletes all {count} {count === 1 ? "order" : "orders"}, with their receipts and notes. Stock they still hold goes back on the shelf, and
        order codes start again from 0001. A copy of the database is saved on the server first.
      </p>
      <button type="button" disabled={count === 0} onClick={() => setOpen(true)} className="btn btn-danger mt-4">
        Clear order history
      </button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setTyped(""); setError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Delete all {count} orders?</DialogTitle>
            <DialogDescription>This can&apos;t be undone from here. Type DELETE to confirm.</DialogDescription>
          </DialogHeader>
          <label htmlFor="clear-confirm" className="field-label">Type DELETE</label>
          <input id="clear-confirm" className="field" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" />
          {error ? <p className="field-error" role="alert">{error}</p> : null}
          <DialogFooter>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">Keep the orders</button>
            <button type="button" disabled={pending || typed.trim() !== "DELETE"} onClick={clear} className="btn btn-danger">
              {pending ? "Deleting…" : "Delete all orders"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
