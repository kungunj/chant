/**
 * SparesHub adds a markup on top of the price the seller quotes. Buyers see and pay the marked-up
 * price; the seller receives their own price and SparesHub keeps the markup once the buyer confirms
 * delivery (see escrow.ts). Set with PLATFORM_MARKUP_PERCENT, default 5.
 */
export function markupPercent(env: Record<string, string | undefined> = process.env) {
  const percent = Number(env.PLATFORM_MARKUP_PERCENT ?? 5);
  return Number.isFinite(percent) && percent >= 0 ? Math.min(percent, 100) : 5;
}

/** SparesHub's markup on one item, rounded up to whole shillings. */
export function markupFor(sellerPriceKes: number, percent = markupPercent()) {
  return Math.ceil((sellerPriceKes * percent) / 100 - 1e-9);
}

/** The price buyers see for a seller's quoted price. */
export function buyerPrice(sellerPriceKes: number, percent = markupPercent()) {
  return sellerPriceKes + markupFor(sellerPriceKes, percent);
}

/** The lowest seller price whose buyer price is at least `buyerKes` (for search price filters). */
export function sellerPriceAtLeast(buyerKes: number, percent = markupPercent()) {
  let price = Math.max(0, Math.floor(buyerKes / (1 + percent / 100)) - 1);
  while (buyerPrice(price, percent) < buyerKes) price++;
  return price;
}

/** The highest seller price whose buyer price is at most `buyerKes`. */
export function sellerPriceAtMost(buyerKes: number, percent = markupPercent()) {
  return sellerPriceAtLeast(buyerKes + 1, percent) - 1;
}
