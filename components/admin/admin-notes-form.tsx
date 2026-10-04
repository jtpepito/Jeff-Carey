"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveAdminNotes } from "@/actions/orders";

export function AdminNotesForm({ orderId, initial }: { orderId: number; initial: string }) {
  const [notes, setNotes] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await saveAdminNotes(orderId, notes);
          toast.success("Notes saved");
        });
      }}
    >
      <label htmlFor="admin-notes" className="field-label">Internal notes</label>
      <textarea id="admin-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} className="field" placeholder="Only staff see these." />
      <button type="submit" disabled={pending} className="btn btn-outline mt-3">
        {pending ? "Saving…" : "Save notes"}
      </button>
    </form>
  );
}
