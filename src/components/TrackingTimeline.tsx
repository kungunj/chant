import type { Shipment, ShipmentEvent } from "@prisma/client";
import { getCourierProvider } from "@/lib/couriers";
import { courierLabels, shipmentStatusLabels } from "@/lib/format";

export function TrackingTimeline({ shipment }: { shipment: Shipment & { events: ShipmentEvent[] } }) {
  const provider = getCourierProvider(shipment.courier);
  const events = [...shipment.events].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <p>
          {courierLabels[shipment.courier]} · <span className="font-mono">{shipment.trackingNumber}</span>
        </p>
        <span className="badge bg-brand-100 text-brand-700">{shipmentStatusLabels[shipment.status]}</span>
      </div>
      <ol className="relative space-y-4 border-l border-stone-200 pl-5">
        {events.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500" />
            <p className="text-sm font-medium">{shipmentStatusLabels[e.status]}</p>
            <p className="text-xs text-stone-500">
              {e.occurredAt.toLocaleString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short" })}
              {e.location && ` · ${e.location}`}
            </p>
            {e.note && <p className="text-sm text-stone-600">{e.note}</p>}
          </li>
        ))}
      </ol>
      {!provider.isLive() && provider.website && (
        <p className="text-xs text-stone-500">
          Updates are posted by the seller. You can also check the tracking number on the{" "}
          <a href={provider.website} target="_blank" rel="noreferrer" className="underline">
            {provider.name} website
          </a>
          .
        </p>
      )}
    </div>
  );
}
