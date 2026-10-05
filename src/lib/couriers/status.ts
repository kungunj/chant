import type { ShipmentStatus } from "@prisma/client";

const rules: [RegExp, ShipmentStatus][] = [
  [/return/i, "RETURNED"],
  [/deliver(ed)?\b(?!.*(out|attempt))|collected|picked up by (recipient|customer)/i, "DELIVERED"],
  [/out for delivery|with (rider|driver)|on delivery/i, "OUT_FOR_DELIVERY"],
  [/arrived|at (branch|office|counter)|ready for (collection|pickup)/i, "ARRIVED_AT_BRANCH"],
  [/transit|dispatched|departed|in route|en route|forwarded/i, "IN_TRANSIT"],
  [/received|booked|accepted|awaiting|created/i, "AWAITING_PICKUP"],
];

/** Maps a courier's free-text status ("Item arrived at Nakuru PCK") to our status enum. */
export function mapCourierStatus(text: string): ShipmentStatus | null {
  for (const [pattern, status] of rules) if (pattern.test(text)) return status;
  return null;
}
