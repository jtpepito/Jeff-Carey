import type { OrderStatus } from "@/lib/orders";
import { cn } from "@/lib/utils";

const STYLES: Record<OrderStatus, string> = {
  new: "bg-gold/15 text-[#5f4a0c]",
  confirmed: "bg-[#dbe7f3] text-[#1f4a73]",
  shipped: "bg-[#e6def5] text-[#4b3384]",
  delivered: "bg-[#d9ecdd] text-[#1f5a31]",
  cancelled: "bg-[#eee6e2] text-[#6f5a52] line-through decoration-1",
};

export function StatusBadge({ status, ...rest }: { status: OrderStatus } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span {...rest} className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize", STYLES[status])}>
      {status}
    </span>
  );
}
