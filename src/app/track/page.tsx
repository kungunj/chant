import type { Courier } from "@prisma/client";
import { TrackingTimeline } from "@/components/TrackingTimeline";
import { prisma } from "@/lib/db";
import { courierLabels } from "@/lib/format";
import { syncShipment } from "@/lib/shipments";

type Props = { searchParams: Promise<{ courier?: string; number?: string }> };

export default async function TrackPage({ searchParams }: Props) {
  const sp = await searchParams;
  const courier = sp.courier && sp.courier in courierLabels ? (sp.courier as Courier) : undefined;
  const number = sp.number?.trim().toUpperCase();

  let shipment = null;
  if (number) {
    const found = await prisma.shipment.findFirst({
      where: { trackingNumber: number, ...(courier ? { courier } : {}) },
    });
    if (found) {
      await syncShipment(found.id);
      shipment = await prisma.shipment.findUnique({ where: { id: found.id }, include: { events: true } });
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Track a parcel</h1>
      <form className="card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="courier">Courier</label>
          <select id="courier" name="courier" defaultValue={courier ?? ""} className="input">
            <option value="">Any</option>
            <option value="POSTA_KENYA">Posta Kenya</option>
            <option value="FARGO_COURIER">Fargo Courier</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="number">Tracking number</label>
          <input id="number" name="number" defaultValue={sp.number} required className="input font-mono" />
        </div>
        <button className="btn-primary">Track</button>
      </form>
      {number && (
        <div className="card p-4">
          {shipment ? (
            <TrackingTimeline shipment={shipment} />
          ) : (
            <p className="text-sm text-stone-600">No SparesHub parcel found with tracking number {number}.</p>
          )}
        </div>
      )}
    </div>
  );
}
