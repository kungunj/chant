import type { Courier } from "@prisma/client";
import { createHttpProvider } from "./http";
import type { CourierProvider } from "./types";

export type { CourierProvider, TrackingEvent } from "./types";
export { mapCourierStatus } from "./status";

function build(env: Record<string, string | undefined>): Record<Courier, CourierProvider> {
  return {
    POSTA_KENYA: createHttpProvider({
      id: "POSTA_KENYA",
      name: "Posta Kenya",
      website: "https://www.posta.co.ke",
      apiUrl: env.POSTA_TRACKING_API_URL || undefined,
      apiKey: env.POSTA_TRACKING_API_KEY || undefined,
    }),
    FARGO_COURIER: createHttpProvider({
      id: "FARGO_COURIER",
      name: "Fargo Courier",
      website: "https://www.fargocourier.co.ke",
      apiUrl: env.FARGO_TRACKING_API_URL || undefined,
      apiKey: env.FARGO_TRACKING_API_KEY || undefined,
    }),
    OTHER: createHttpProvider({ id: "OTHER", name: "Other courier" }),
  };
}

export function getCourierProvider(courier: Courier, env: Record<string, string | undefined> = process.env): CourierProvider {
  return build(env)[courier];
}
