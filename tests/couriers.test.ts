import { describe, expect, it } from "vitest";
import { getCourierProvider, mapCourierStatus } from "@/lib/couriers";
import { parse } from "@/lib/couriers/http";

describe("mapCourierStatus", () => {
  it.each([
    ["Item accepted at Nairobi GPO", "AWAITING_PICKUP"],
    ["Dispatched to Mombasa", "IN_TRANSIT"],
    ["In transit", "IN_TRANSIT"],
    ["Arrived at Nakuru branch", "ARRIVED_AT_BRANCH"],
    ["Ready for collection", "ARRIVED_AT_BRANCH"],
    ["Out for delivery", "OUT_FOR_DELIVERY"],
    ["Delivered", "DELIVERED"],
    ["Returned to sender", "RETURNED"],
  ])("maps %s", (text, expected) => {
    expect(mapCourierStatus(text)).toBe(expected);
  });

  it("returns null for unknown text", () => {
    expect(mapCourierStatus("???")).toBeNull();
  });
});

describe("courier providers", () => {
  it("fall back to manual updates when no API is configured", () => {
    expect(getCourierProvider("POSTA_KENYA", {}).isLive()).toBe(false);
    expect(getCourierProvider("FARGO_COURIER", {}).isLive()).toBe(false);
  });

  it("go live when an API URL is configured", () => {
    const env = { FARGO_TRACKING_API_URL: "https://api.example/track" };
    expect(getCourierProvider("FARGO_COURIER", env).isLive()).toBe(true);
  });

  it("parses and orders API events, skipping unknown ones", () => {
    const events = parse({
      events: [
        { status: "Delivered", date: "2026-03-02T10:00:00Z", location: "Eldoret" },
        { description: "Dispatched", date: "2026-03-01T08:00:00Z" },
        { status: "Something odd", date: "2026-03-01T09:00:00Z" },
      ],
    });
    expect(events.map((e) => e.status)).toEqual(["IN_TRANSIT", "DELIVERED"]);
  });
});
