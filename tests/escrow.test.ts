import { describe, expect, it } from "vitest";
import { canAccessDispute } from "@/lib/disputes";
import { commissionFor } from "@/lib/escrow";
import { sniffMimeType } from "@/lib/storage";

describe("commissionFor", () => {
  it("is zero when no commission is configured", () => {
    expect(commissionFor(5000, 0)).toBe(0);
    expect(commissionFor(5000, NaN)).toBe(0);
  });

  it("rounds down to whole shillings", () => {
    expect(commissionFor(999, 5)).toBe(49);
    expect(commissionFor(2000, 2.5)).toBe(50);
  });

  it("never exceeds the amount", () => {
    expect(commissionFor(100, 150)).toBe(100);
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
