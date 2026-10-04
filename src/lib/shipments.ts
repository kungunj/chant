import type { ShipmentStatus } from "@prisma/client";
import { getCourierProvider } from "./couriers";
import { prisma } from "./db";
import { autoReleaseDays } from "./escrow";
import { shipmentStatusLabels } from "./format";
import { notify } from "./notify";

const SYNC_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Adds a status update to a shipment and tells the buyer. A "delivered" update from the seller or
 * courier does not complete the order: it starts the auto-release timer (see escrow.ts), and the
 * buyer's confirmation, a moderator or that timer releases the escrowed money.
 */
export async function recordShipmentEvent(params: {
  shipmentId: string;
  status: ShipmentStatus;
  location?: string | null;
  note?: string | null;
  source: string;
  occurredAt?: Date;
}) {
  const shipment = await prisma.shipment.update({
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
    include: { order: true },
  });

  if (params.source === "buyer") return shipment;
  const { order } = shipment;
  if (params.status === "DELIVERED" && !order.deliveredMarkedAt && order.escrowStatus === "HELD") {
    const days = autoReleaseDays();
    await prisma.order.update({
      where: { id: order.id },
      data: { deliveredMarkedAt: new Date(), autoReleaseAt: days ? new Date(Date.now() + days * 86_400_000) : null },
    });
    await notify(order.buyerId, {
      title: "Parcel marked delivered",
      body: days
        ? `Your parcel ${shipment.trackingNumber} was marked delivered. Confirm you received it, or open a dispute within ${days} days, otherwise payment is released to the seller automatically.`
        : `Your parcel ${shipment.trackingNumber} was marked delivered. Please confirm you received it so the seller is paid.`,
      link: `/orders/${order.id}`,
      sms: true,
    });
  } else {
    await notify(order.buyerId, {
      title: "Tracking update",
      body: `${shipment.trackingNumber}: ${shipmentStatusLabels[params.status]}${params.location ? ` at ${params.location}` : ""}.`,
      link: `/orders/${order.id}`,
    });
  }
  return shipment;
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
