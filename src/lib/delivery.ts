import type { Courier } from "@prisma/client";

type FeeStore = { postaFeeKes: number | null; fargoFeeKes: number | null };

/** The store's fee for a courier, or null when it does not ship with that courier. */
export function deliveryFee(store: FeeStore, courier: Courier): number | null {
  if (courier === "POSTA_KENYA") return store.postaFeeKes;
  if (courier === "FARGO_COURIER") return store.fargoFeeKes;
  return null;
}
