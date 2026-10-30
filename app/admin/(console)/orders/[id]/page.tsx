import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNotesForm } from "@/components/admin/admin-notes-form";
import { OrderStatusButtons } from "@/components/admin/order-status-buttons";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatPeso } from "@/lib/money";
import { getOrder, nextStatuses } from "@/lib/orders";
import { formatDateOnly, formatManila } from "@/lib/time";
import { paymentLabel } from "@/lib/payment";
import { ReadyEmailButton } from "@/components/admin/ready-email-button";
import { emailConfigured } from "@/lib/email";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const order = getOrder(Number((await params).id));
  if (!order) notFound();
  const pickup = order.fulfilment === "pickup";

  return (
    <>
      <Link href="/admin/orders" className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground hover:text-foreground">
        ← All orders
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl tabular-nums">{order.code}</h1>
        <StatusBadge status={order.status} data-testid="status" />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Placed {formatManila(order.createdAt)}</p>
      {order.preferredDate ? (
        <p className="mt-2 inline-block rounded-full bg-gold/25 px-3 py-1 text-sm font-semibold text-[#5f4a0c]">
          Wanted by {formatDateOnly(order.preferredDate)} ({pickup ? "pickup" : "delivery"})
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-start">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="next-step">
            <h2 id="next-step" className="text-xl">Next step</h2>
            <div className="mt-3">
              <OrderStatusButtons orderId={order.id} next={nextStatuses(order.status)} />
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <ReadyEmailButton
                orderId={order.id}
                email={order.email}
                sentAt={order.readyEmailedAt ? formatManila(order.readyEmailedAt) : null}
                blockedReason={
                  order.status === "cancelled"
                    ? "This order was cancelled."
                    : !order.email
                      ? "No email address on this order (placed before checkout asked for one)."
                      : !emailConfigured()
                        ? "Email isn't set up yet. Add the shop's Gmail address and app password as Fly secrets (see the README)."
                        : null
                }
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="items">
            <h2 id="items" className="text-xl">Items</h2>
            <ul className="mt-2 divide-y divide-border">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-2.5 text-[15px]">
                  <span>
                    {i.name}
                    <span className="block text-sm text-muted-foreground">{i.qty} × {formatPeso(i.price)}</span>
                  </span>
                  <span className="font-medium tabular-nums">{formatPeso(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1.5 border-t border-border pt-3 text-[15px]">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{formatPeso(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd className="tabular-nums">{pickup ? "Pickup" : order.shippingFee === 0 ? "Free" : formatPeso(order.shippingFee)}</dd></div>
              <div className="flex justify-between pt-1 text-lg font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatPeso(order.total)}</dd></div>
            </dl>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <AdminNotesForm orderId={order.id} initial={order.adminNotes} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="customer">
            <h2 id="customer" className="text-xl">Customer</h2>
            <p className="mt-2 font-medium">{order.customerName}</p>
            <a href={`tel:${order.mobile}`} className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">{order.mobile}</a>
            {order.email ? (
              <a href={`mailto:${order.email}`} className="block min-h-11 break-all font-medium text-primary underline underline-offset-4">{order.email}</a>
            ) : null}
            {pickup ? (
              <p className="mt-2 inline-block rounded-full bg-gold/25 px-3 py-1 text-sm font-semibold text-[#5f4a0c]">Customer will pick up</p>
            ) : (
              <>
                <p className="mt-2 text-[15px]">{order.address}</p>
                <p className="text-[15px]">{order.city}, {order.province}</p>
              </>
            )}
            {order.notes ? (
              <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-[15px]"><span className="font-semibold">{pickup ? "Notes:" : "Delivery notes:"}</span> {order.notes}</p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="payment">
            <h2 id="payment" className="text-xl">Payment</h2>
            <p className="mt-2 font-medium">{paymentLabel(order.paymentMethod, pickup)}</p>
            {order.gcashRef ? <p className="text-[15px]">Reference: {order.gcashRef}</p> : null}
            {order.proof ? (
              <div className="mt-3">
                <a href={`/admin/orders/${order.id}/proof`} target="_blank" rel="noopener" className="font-medium text-primary underline underline-offset-4">
                  View proof of payment
                </a>
                <span className="ml-2 text-sm text-muted-foreground">({Math.max(1, Math.round(order.proof.size / 1024))} KB)</span>
                {order.proof.mime === "image/jpeg" || order.proof.mime === "image/png" || order.proof.mime === "image/webp" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- private admin-only file, not for the image optimiser
                  <img src={`/admin/orders/${order.id}/proof`} alt="Customer's proof of payment" className="mt-3 max-h-96 w-auto rounded-xl border border-border" />
                ) : null}
              </div>
            ) : order.paymentMethod !== "cod" ? (
              <p className="mt-2 text-sm text-destructive">No receipt was attached.</p>
            ) : null}
            {order.paymentMethod !== "cod" ? null : (
              <p className="text-[15px] text-muted-foreground">Collect {formatPeso(order.total)} {pickup ? "at pickup" : "on delivery"}.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
