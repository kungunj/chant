import type { Courier } from "@prisma/client";
import { mapCourierStatus } from "./status";
import type { CourierProvider, TrackingEvent } from "./types";

type RawEvent = { status?: string; description?: string; location?: string; date?: string; occurredAt?: string };

/**
 * Generic adapter for a courier tracking API. Neither Posta Kenya nor Fargo Courier publishes
 * an open API today, so this only activates when an API URL is configured. It calls
 * GET {apiUrl}?trackingNumber=... and accepts either an array of events or { events: [...] },
 * each with a free-text status/description, optional location and date. Adjust
 * `parse` once the courier shares their real response format.
 */
export function createHttpProvider(opts: {
  id: Courier;
  name: string;
  website?: string;
  apiUrl?: string;
  apiKey?: string;
}): CourierProvider {
  return {
    id: opts.id,
    name: opts.name,
    website: opts.website,
    isLive: () => Boolean(opts.apiUrl),
    async fetchEvents(trackingNumber) {
      if (!opts.apiUrl) return null;
      const url = new URL(opts.apiUrl);
      url.searchParams.set("trackingNumber", trackingNumber);
      const res = await fetch(url, {
        headers: opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {},
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`${opts.name} tracking failed (${res.status})`);
      return parse(await res.json());
    },
  };
}

export function parse(body: unknown): TrackingEvent[] {
  const list = Array.isArray(body) ? body : ((body as { events?: unknown[] })?.events ?? []);
  const events: TrackingEvent[] = [];
  for (const raw of list as RawEvent[]) {
    const text = raw.status ?? raw.description ?? "";
    const status = mapCourierStatus(text);
    const when = new Date(raw.occurredAt ?? raw.date ?? "");
    if (!status || Number.isNaN(when.getTime())) continue;
    events.push({ status, location: raw.location, note: text, occurredAt: when });
  }
  return events.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}
