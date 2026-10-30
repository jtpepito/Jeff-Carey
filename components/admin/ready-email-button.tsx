"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { sendReadyEmailAction } from "@/actions/orders";

type Props = {
  orderId: number;
  email: string;
  /** When the ready email last went out, formatted for display. */
  sentAt: string | null;
  /** Why the button can't be used, if it can't. */
  blockedReason: string | null;
};

/** Emails the customer that their order is ready for pick-up. */
export function ReadyEmailButton({ orderId, email, sentAt, blockedReason }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function send() {
    if (sentAt && !window.confirm(`The ready email already went to ${email} (${sentAt}). Send it again?`)) return;
    startTransition(async () => {
      const result = await sendReadyEmailAction(orderId);
      if (result.ok) toast.success(`Ready email sent to ${result.to}`);
      else toast.error(result.error);
      router.refresh();
    });
  }

  return (
    <div>
      <button type="button" disabled={pending || blockedReason !== null} onClick={send} className="btn btn-outline">
        {pending ? "Sending…" : sentAt ? "Send ready email again" : "Send email: ready for pick-up"}
      </button>
      {sentAt ? <p className="mt-2 text-sm text-muted-foreground">Ready email sent {sentAt}.</p> : null}
      {blockedReason ? <p className="mt-2 text-sm text-muted-foreground">{blockedReason}</p> : null}
    </div>
  );
}
