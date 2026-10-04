import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmpty } from "@/components/admin/admin-empty";
import { OrderRows } from "@/components/admin/order-rows";
import { listOrders, ORDER_STATUSES, type OrderStatus } from "@/lib/orders";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  const raw = (await searchParams).status;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const status = ORDER_STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : undefined;
  const orders = listOrders({ status });
  const filters: { label: string; href: string; active: boolean }[] = [
    { label: "All", href: "/admin/orders", active: !status },
    ...ORDER_STATUSES.map((s) => ({ label: s, href: `/admin/orders?status=${s}`, active: s === status })),
  ];

  return (
    <>
      <h1 className="text-3xl">Orders</h1>
      <nav aria-label="Filter by status" className="scroll-row -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.href}
            aria-current={f.active ? "true" : undefined}
            className={cn(
              "inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium capitalize",
              f.active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:border-foreground/40",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <div className="mt-5">
        {orders.length === 0 ? (
          status ? (
            <AdminEmpty title={`Nothing marked ${status}`} body="Try another status, or view all orders." action={{ href: "/admin/orders", label: "View all orders" }} />
          ) : (
            <AdminEmpty title="No orders yet" body="When a customer checks out, the order appears here as new." action={{ href: "/", label: "View the store" }} />
          )
        ) : (
          <OrderRows orders={orders} />
        )}
      </div>
    </>
  );
}
