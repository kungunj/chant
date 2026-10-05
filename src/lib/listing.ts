import type { Condition } from "@prisma/client";

const NOTHING = /^(none|nothing|n\/a|na|-|no faults?|all (works|working)|everything works)\.?$/i;

/**
 * Used and refurbished items must say what works and what doesn't, so buyers know exactly what they get
 * (e.g. "TV motherboard works, screen broken"). Items sold for parts must name at least one fault.
 * Returns the problem to show the seller, or null when the listing is fine.
 */
export function checkConditionDetails(condition: Condition, working?: string, faulty?: string): string | null {
  if (condition === "NEW_SPARE") return null;
  if (!working || working.length < 3) return "Say what works on this item, e.g. \"Board powers on, HDMI works\"";
  if (!faulty || faulty.length < 2) return "Say what doesn't work, e.g. \"Screen broken\", or write \"None\" if everything works";
  if (condition === "USED_FOR_PARTS" && NOTHING.test(faulty.trim())) {
    return "Items sold for parts must say what is faulty or missing";
  }
  return null;
}

/** "None" and similar mean the seller knows of no faults. */
export function hasNoFaults(faulty: string | null | undefined): boolean {
  return !!faulty && NOTHING.test(faulty.trim());
}
