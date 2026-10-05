import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { TrackingTimeline } from "@/components/TrackingTimeline";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isStaff } from "@/lib/roles";
import { syncShipment } from "@/lib/shipments";

type Props = { searchParams: Promise<{ number?: string }> };

export default async function TrackPage({ searchParams }: Props) {
  // Tracking shows names, towns and order details, so only the buyer, the seller and moderators see a parcel.
  const user = await requireUser("/track");
  const sp = await searchParams;
  const number = sp.number?.trim().toUpperCase();

  const mine: Prisma.ShipmentWhereInput = { order: { OR: [{ buyerId: user.id }, { store: { ownerId: user.id } }] } };
  // Your parcels still on the way, plus ones delivered in the last two weeks. Moderators can look up any number.
  const where: Prisma.ShipmentWhereInput = number
    ? { ...(isStaff(user.role) ? {} : mine), trackingNumber: number }
    : {
        ...mine,
        OR: [
          { status: { notIn: ["DELIVERED", "RETURNED"] } },
          { updatedAt: { gte: new Date(Date.now() - 14 * 86_400_000) } },
        ],
      };

  const found = await prisma.shipment.findMany({
    where,
    select: { id: true, status: true },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  await Promise.all(
    found.filter((s) => s.status !== "DELIVERED" && s.status !== "RETURNED").map((s) => syncShipment(s.id)),
  );
  const shipments = await prisma.shipment.findMany({
    where: { id: { in: found.map((s) => s.id) } },
    include: {
      events: true,
      order: { select: { id: true, buyerId: true, store: { select: { name: true, ownerId: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Track your parcels</h1>
      <form className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="number">
            Find by tracking number
          </label>
          <input
            id="number"
            name="number"
            defaultValue={sp.number}
            className="input font-mono"
            placeholder="e.g. RR123456789KE"
          />
        </div>
        <button className="btn-primary">Track</button>
        {number && (
          <Link href="/track" className="btn-secondary">
            Show all my parcels
          </Link>
        )}
      </form>

      {shipments.length === 0 ? (
        <div className="card p-6 text-sm text-stone-600">
          {number
            ? `None of your orders has a parcel with tracking number ${number}.`
            : "You have no parcels on the way. Parcels show here once the seller ships your order."}
        </div>
      ) : (
        shipments.map((s) => (
          <div key={s.id} className="card space-y-3 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="text-stone-600">
                {s.order.buyerId === user.id
                  ? `From ${s.order.store.name}`
                  : s.order.store.ownerId === user.id
                    ? "Your sale"
                    : s.order.store.name}
              </span>
              {s.order.buyerId === user.id ? (
                <Link href={`/orders/${s.order.id}`} className="text-brand-600 hover:underline">
                  View order
                </Link>
              ) : s.order.store.ownerId === user.id ? (
                <Link href={`/dashboard/orders/${s.order.id}`} className="text-brand-600 hover:underline">
                  View order
                </Link>
              ) : null}
            </div>
            <TrackingTimeline shipment={s} />
          </div>
        ))
      )}
    </div>
  );
}
