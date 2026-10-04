import Link from "next/link";
import { formatPeso } from "@/lib/money";
import type { OrderSummary } from "@/lib/orders";
import { formatManila } from "@/lib/time";
import { StatusBadge } from "./status-badge";

const COLS = "md:grid md:grid-cols-[9rem_11rem_1fr_7rem_5rem_7rem] md:items-center md:gap-4";

/** Orders as tappable rows: stacked cards on phones, a table-like grid from md up. */
export function OrderRows({ orders }: { orders: OrderSummary[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className={`hidden border-b border-border px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase ${COLS}`}>
        <span>Code</span>
        <span>Date</span>
        <span>Customer</span>
        <span className="text-right">Total</span>
        <span>Payment</span>
        <span>Status</span>
      </div>
      <ul className="divide-y divide-border">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/admin/orders/${o.id}`} className={`block px-4 py-3.5 hover:bg-muted/60 ${COLS}`}>
              <span className="flex items-center justify-between gap-3 md:contents">
                <span className="font-semibold tabular-nums">{o.code}</span>
                <span className="md:order-last"><StatusBadge status={o.status} /></span>
              </span>
              <span className="mt-1 block text-sm text-muted-foreground md:mt-0">{formatManila(o.createdAt)}</span>
              <span className="mt-1 flex items-baseline justify-between gap-3 md:contents">
                <span className="truncate">{o.customerName}</span>
                <span className="font-semibold tabular-nums md:text-right">{formatPeso(o.total)}</span>
              </span>
              <span className="text-sm text-muted-foreground md:text-foreground">{o.paymentMethod === "cod" ? "COD" : "GCash"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
