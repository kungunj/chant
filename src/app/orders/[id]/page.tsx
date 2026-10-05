import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelUnpaidOrder } from "@/app/actions/orders";
import { EscrowPanel } from "@/components/EscrowPanel";
import { CancelOrderForm, ReviewForm } from "@/components/OrderActions";
import { Stars } from "@/components/Stars";
import { TrackingTimeline } from "@/components/TrackingTimeline";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { courierLabels, displayPhone, formatKes, orderStatusLabels } from "@/lib/format";
import { syncShipment } from "@/lib/shipments";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/orders/${id}`);
  const existing = await prisma.order.findFirst({ where: { id, buyerId: user.id }, select: { shipment: true } });
  if (!existing) notFound();
  if (existing.shipment) await syncShipment(existing.shipment.id);

  const order = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: { store: true, items: true, payment: true, dispute: true, review: true, shipment: { include: { events: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Order from {order.store.name}</h1>
        <span className="badge text-sm">{orderStatusLabels[order.status]}</span>
      </div>

      <div className="card divide-y divide-stone-200 text-sm">
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between p-3">
            <Link href={`/products/${i.productId}`} className="hover:text-brand-600">
              {i.quantity} × {i.title}
            </Link>
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
          <span>Total</span>
          <span>{formatKes(order.totalKes)}</span>
        </div>
      </div>

      {order.status === "PENDING_PAYMENT" && (
        <div className="flex flex-wrap gap-2">
          {order.payment && (
            <Link href={`/payments/${order.payment.id}`} className="btn-mpesa">Complete M-Pesa payment</Link>
          )}
          <form action={cancelUnpaidOrder}>
            <input type="hidden" name="orderId" value={order.id} />
            <button className="btn-secondary">Cancel order</button>
          </form>
        </div>
      )}
      {order.status === "CANCELLED" && order.cancelReason && (
        <p className="rounded-md bg-stone-100 p-3 text-sm text-stone-700">Cancelled. {order.cancelReason}</p>
      )}
      {order.status === "PAID" && order.dispute?.status !== "OPEN" && <CancelOrderForm orderId={order.id} role="buyer" />}

      {(order.status === "DELIVERED" || order.status === "REFUNDED") && (
        <div className="card p-4">
          {order.review ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold">Your review</p>
              <Stars rating={order.review.rating} />
              {order.review.comment && <p className="text-stone-600">{order.review.comment}</p>}
            </div>
          ) : (
            <ReviewForm orderId={order.id} />
          )}
        </div>
      )}

      <EscrowPanel order={order} role="buyer" />

      <div className="card space-y-1 p-4 text-sm">
        <h2 className="mb-1 font-semibold">Delivery</h2>
        <p>{order.shippingName} · {displayPhone(order.shippingPhone)}</p>
        <p>{order.shippingAddress}, {order.shippingTown}</p>
        <p className="text-stone-500">Courier: {courierLabels[order.courier]}</p>
        {order.payment?.mpesaReceipt && <p className="text-stone-500">M-Pesa receipt: {order.payment.mpesaReceipt}</p>}
      </div>

      <div className="card p-4">
        <h2 className="mb-3 font-semibold">Tracking</h2>
        {order.shipment ? (
          <TrackingTimeline shipment={order.shipment} />
        ) : (
          <p className="text-sm text-stone-500">
            {order.status === "PAID" ? "The seller is preparing your parcel." : "Tracking appears once the seller ships."}
          </p>
        )}
      </div>
    </div>
  );
}
