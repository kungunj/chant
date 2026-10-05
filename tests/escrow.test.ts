import { describe, expect, it } from "vitest";
import { canAccessDispute } from "@/lib/disputes";
import { commissionFor } from "@/lib/escrow";
import { buyerPrice, markupFor, markupPercent, sellerPriceAtLeast, sellerPriceAtMost } from "@/lib/pricing";
import { sniffMimeType } from "@/lib/storage";

describe("commissionFor", () => {
  const order = { totalKes: 2400, markupKes: 100 };

  it("keeps the whole markup when the seller gets the whole order", () => {
    expect(commissionFor(order, 2400)).toBe(100);
  });

  it("keeps nothing when the buyer is refunded in full", () => {
    expect(commissionFor(order, 0)).toBe(0);
  });

  it("keeps a proportional share on a split, rounded down", () => {
    expect(commissionFor(order, 1200)).toBe(50);
    expect(commissionFor(order, 1000)).toBe(41);
  });
});

describe("buyer prices", () => {
  it("adds 5% to the seller's price, rounded up to whole shillings", () => {
    expect(markupPercent({})).toBe(5);
    expect(buyerPrice(2000, 5)).toBe(2100);
    expect(buyerPrice(999, 5)).toBe(1049);
    expect(markupFor(3500, 5)).toBe(175);
    expect(buyerPrice(2000, 0)).toBe(2000);
  });

  it("falls back to 5% on a bad setting", () => {
    expect(markupPercent({ PLATFORM_MARKUP_PERCENT: "abc" })).toBe(5);
    expect(markupPercent({ PLATFORM_MARKUP_PERCENT: "2.5" })).toBe(2.5);
  });

  it("turns buyer price filters into seller price bounds", () => {
    for (const kes of [1, 100, 1049, 1050, 2100, 2101, 99999]) {
      const lo = sellerPriceAtLeast(kes, 5);
      expect(buyerPrice(lo, 5)).toBeGreaterThanOrEqual(kes);
      if (lo > 0) expect(buyerPrice(lo - 1, 5)).toBeLessThan(kes);
      const hi = sellerPriceAtMost(kes, 5);
      expect(buyerPrice(hi, 5)).toBeLessThanOrEqual(kes);
      expect(buyerPrice(hi + 1, 5)).toBeGreaterThan(kes);
    }
  });
});

describe("sniffMimeType", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);

  it("recognises JPEG, PNG and PDF by their first bytes", () => {
    expect(sniffMimeType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffMimeType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffMimeType(new TextEncoder().encode("%PDF-1.7 ..."))).toBe("application/pdf");
    expect(sniffMimeType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
  });

  it("rejects anything else, whatever the file is called", () => {
    expect(sniffMimeType(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
    expect(sniffMimeType(new TextEncoder().encode("GIF89a"))).toBeNull();
  });
});

describe("canAccessDispute", () => {
  const dispute = { order: { buyerId: "buyer", store: { ownerId: "seller" } } };

  it("lets the buyer, the seller and moderators in", () => {
    expect(canAccessDispute({ id: "buyer", role: "BUYER" }, dispute)).toBe(true);
    expect(canAccessDispute({ id: "seller", role: "TECHNICIAN" }, dispute)).toBe(true);
    expect(canAccessDispute({ id: "mod", role: "ADMIN" }, dispute)).toBe(true);
  });

  it("keeps everyone else out", () => {
    expect(canAccessDispute({ id: "other", role: "TECHNICIAN" }, dispute)).toBe(false);
  });
});
