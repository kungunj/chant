import type { ShipmentStatus } from "@prisma/client";
import { getCourierProvider } from "./couriers";
import { prisma } from "./db";

const SYNC_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Adds a status update to a shipment. A "delivered" update from the seller or courier does not
 * complete the order: only the buyer's confirmation (or a moderator) releases the escrowed money.
 */
export async function recordShipmentEvent(params: {
  shipmentId: string;
  status: ShipmentStatus;
  location?: string | null;
  note?: string | null;
  source: string;
  occurredAt?: Date;
}) {
  return prisma.shipment.update({
    where: { id: params.shipmentId },
    data: {
      status: params.status,
      events: {
        create: {
          status: params.status,
          location: params.location || null,
          note: params.note || null,
          source: params.source,
          occurredAt: params.occurredAt ?? new Date(),
        },
      },
    },
  });
}

/**
 * Pulls new events from the courier's API when one is configured. Couriers without an API
 * rely on the seller posting updates manually, so this is a no-op for them.
 */
export async function syncShipment(shipmentId: string, { force = false } = {}) {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId }, include: { events: true } });
  if (!shipment) return;
  const provider = getCourierProvider(shipment.courier);
  if (!provider.isLive()) return;
  if (!force && shipment.lastSyncedAt && Date.now() - shipment.lastSyncedAt.getTime() < SYNC_INTERVAL_MS) return;

  try {
    const events = (await provider.fetchEvents(shipment.trackingNumber)) ?? [];
    const seen = new Set(shipment.events.map((e) => `${e.status}@${e.occurredAt.getTime()}`));
    for (const event of events) {
      if (seen.has(`${event.status}@${event.occurredAt.getTime()}`)) continue;
      await recordShipmentEvent({ shipmentId, ...event, source: provider.id });
    }
  } catch (error) {
    console.error(`Tracking sync failed for shipment ${shipmentId}`, error);
  } finally {
    await prisma.shipment.update({ where: { id: shipmentId }, data: { lastSyncedAt: new Date() } });
  }
}
