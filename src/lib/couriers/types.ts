import type { Courier, ShipmentStatus } from "@prisma/client";

export type TrackingEvent = {
  status: ShipmentStatus;
  location?: string;
  note?: string;
  occurredAt: Date;
};

export interface CourierProvider {
  id: Courier;
  name: string;
  /** Courier's own website, shown so buyers can double-check a tracking number there. */
  website?: string;
  /** True when this provider can fetch tracking events automatically. */
  isLive(): boolean;
  /** Fetches the latest events for a tracking number, or null when not supported. */
  fetchEvents(trackingNumber: string): Promise<TrackingEvent[] | null>;
}
