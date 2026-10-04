import Link from "next/link";
import { notFound } from "next/navigation";
import { EscrowPanel } from "@/components/EscrowPanel";
import { CancelOrderForm } from "@/components/OrderActions";
import { Stars } from "@/components/Stars";
import { TrackingTimeline } from "@/components/TrackingTimeline";
import { requireStore } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { courierLabels, displayPhone, formatKes, orderStatusLabels } from "@/lib/format";
import { ShipForm, TrackingUpdateForm } from "./ShippingForms";

export default async function SellerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store } = await requireStore();
  const order = await prisma.order.findFirst({
    where: { id, storeId: store.id, status: { not: "PENDING_PAYMENT" } },
    include: { items: true, payment: true, dispute: true, review: true, buyer: { select: { name: true } }, shipment: { include: { events: true } } },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/dashboard" className="text-sm text-stone-500 hover:underline">← Back to store</Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Order for {order.buyer.name}</h1>
        <span className="badge text-sm">{orderStatusLabels[order.status]}</span>
      </div>

      <div className="card divide-y divide-stone-200 text-sm">
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between p-3">
            <span>{i.quantity} × {i.title}</span>
            <span>{formatKes(i.priceKes * i.quantity)}</span>
          </div>
        ))}
        {order.deliveryFeeKes > 0 && (

          <div className="flex justify-between p-3 text-stone-600">

            <span>Delivery ({courierLabels[order.courier]})</span>

            <span>{formatKes(order.deliveryFeeKes)}</span>

          </div>

        )}
        <div className="flex justify-between p-3 font-semibold">
          <span>Paid via M-Pesa {order.payment?.mpesaReceipt && `(${order.payment.mpesaReceipt})`}</span>
          <span>{formatKes(order.totalKes)}</span>
        </div>
      </div>

      <EscrowPanel order={order} role="seller" />
      {order.status === "PAID" && order.dispute?.status !== "OPEN" && <CancelOrderForm orderId={order.id} role="seller" />}
      {order.status === "CANCELLED" && order.cancelReason && (
        <p className="rounded-md bg-stone-100 p-3 text-sm text-stone-700">Cancelled. {order.cancelReason}</p>
      )}
      {order.review && (
        <div className="card space-y-1 p-4 text-sm">
          <p className="font-semibold">Buyer&apos;s review</p>
          <Stars rating={order.review.rating} />
          {order.review.comment && <p className="text-stone-600">{order.review.comment}</p>}
        </div>
      )}

      <div className="card space-y-1 p-4 text-sm">
        <h2 className="mb-1 font-semibold">Ship to</h2>
        <p>{order.shippingName} · {displayPhone(order.shippingPhone)}</p>
        <p>{order.shippingAddress}, {order.shippingTown}</p>
        <p className="text-stone-500">Buyer chose {courierLabels[order.courier]}</p>
      </div>

      <div className="card space-y-4 p-4">
        <h2 className="font-semibold">Shipping and tracking</h2>
        {order.shipment ? (
          <>
            <TrackingTimeline shipment={order.shipment} />
            {order.status === "SHIPPED" && (
              <div className="border-t border-stone-200 pt-4">
                <p className="mb-2 text-sm text-stone-600">
                  Copy the latest status from the courier so the buyer can follow their parcel. Marking it delivered
                  does not release payment; the buyer&apos;s confirmation does.
                </p>
                <TrackingUpdateForm shipmentId={order.shipment.id} />
              </div>
            )}
          </>
        ) : order.status === "PAID" ? (
          <ShipForm orderId={order.id} courier={order.courier} />
        ) : (
          <p className="text-sm text-stone-500">Nothing to ship.</p>
        )}
      </div>
    </div>
  );
}
