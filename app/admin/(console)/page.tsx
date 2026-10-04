import type { Metadata } from "next";
import Link from "next/link";
import { AdminEmpty } from "@/components/admin/admin-empty";
import { OrderRows } from "@/components/admin/order-rows";
import { formatPeso } from "@/lib/money";
import { dashboardStats } from "@/lib/orders";
import { lowStockVariants } from "@/lib/products";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const { todayOrders, todayRevenue, pendingCount } = dashboardStats();
  const low = lowStockVariants();
  const stats = [
    { label: "Orders today", value: String(todayOrders.length) },
    { label: "Revenue today", value: formatPeso(todayRevenue) },
    { label: "Pending", value: String(pendingCount), href: "/admin/orders?status=new" },
    { label: "Low stock", value: String(low.length) },
  ];

  return (
    <>
      <h1 className="text-3xl">Dashboard</h1>
      <dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => {
          const body = (
            <>
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
              <dd className="mt-1 font-heading text-3xl tabular-nums">{s.value}</dd>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="rounded-2xl border border-border bg-card p-4 hover:border-foreground/40">{body}</Link>
          ) : (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4">{body}</div>
          );
        })}
      </dl>

      <section className="mt-9" aria-labelledby="today-heading">
        <h2 id="today-heading" className="text-2xl">Placed today</h2>
        <div className="mt-3">
          {todayOrders.length === 0 ? (
            <AdminEmpty title="No orders yet today" body="New orders show up here the moment a customer checks out." />
          ) : (
            <OrderRows orders={todayOrders} />
          )}
        </div>
      </section>

      <section className="mt-9" aria-labelledby="low-heading">
        <h2 id="low-heading" className="text-2xl">Running low</h2>
        <div className="mt-3">
          {low.length === 0 ? (
            <AdminEmpty title="Stock levels look healthy" body="Variants with 5 or fewer left will be listed here." />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {low.map((v) => (
                <li key={v.variantId}>
                  <Link href={`/admin/products/${v.productId}`} className="flex min-h-12 items-center justify-between gap-4 px-4 py-2.5 hover:bg-muted/60">
                    <span>
                      {v.productName} <span className="text-muted-foreground">· {v.variantName}</span>
                    </span>
                    <span className={v.stock === 0 ? "font-semibold text-destructive" : "font-semibold text-gold-ink"}>
                      {v.stock === 0 ? "Sold out" : `${v.stock} left`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
