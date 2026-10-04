import Link from "next/link";
import { notFound } from "next/navigation";
import { confirmDelivery } from "@/app/actions/orders";
import { TrackingTimeline } from "@/components/TrackingTimeline";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { courierLabels, formatKes, orderStatusLabels } from "@/lib/format";
import { syncShipment } from "@/lib/shipments";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/orders/${id}`);
  const existing = await prisma.order.findFirst({ where: { id, buyerId: user.id }, select: { shipment: true } });
  if (!existing) notFound();
  if (existing.shipment) await syncShipment(existing.shipment.id);

  const order = await prisma.order.findUniqueOrThrow({
    where: { id },
    include: { store: true, items: true, payment: true, shipment: { include: { events: true } } },
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
        <div className="flex justify-between p-3 font-semibold">
          <span>Total</span>
          <span>{formatKes(order.totalKes)}</span>
        </div>
      </div>

      {order.status === "PENDING_PAYMENT" && order.payment && (
        <Link href={`/payments/${order.payment.id}`} className="btn-mpesa">Complete M-Pesa payment</Link>
      )}

      <div className="card space-y-1 p-4 text-sm">
        <h2 className="mb-1 font-semibold">Delivery</h2>
        <p>{order.shippingName} · {`0${order.shippingPhone.slice(3)}`}</p>
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
        {order.status === "SHIPPED" && (
          <form action={confirmDelivery} className="mt-4">
            <input type="hidden" name="orderId" value={order.id} />
            <button className="btn-secondary">I have received this parcel</button>
          </form>
        )}
      </div>
    </div>
  );
}
