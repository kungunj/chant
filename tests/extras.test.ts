import { describe, expect, it } from "vitest";
import { deliveryFee } from "@/lib/delivery";
import { autoReleaseDays } from "@/lib/escrow";
import { sendSms } from "@/lib/sms";

describe("deliveryFee", () => {
  const store = { postaFeeKes: 300, fargoFeeKes: null };
  it("returns the store's fee for the courier, or null when not offered", () => {
    expect(deliveryFee(store, "POSTA_KENYA")).toBe(300);
    expect(deliveryFee(store, "FARGO_COURIER")).toBeNull();
    expect(deliveryFee({ postaFeeKes: 0, fargoFeeKes: 0 }, "FARGO_COURIER")).toBe(0);
  });
});

describe("autoReleaseDays", () => {
  it("defaults to 7 and can be switched off", () => {
    expect(autoReleaseDays({})).toBe(7);
    expect(autoReleaseDays({ ESCROW_AUTO_RELEASE_DAYS: "14" })).toBe(14);
    expect(autoReleaseDays({ ESCROW_AUTO_RELEASE_DAYS: "0" })).toBe(0);
    expect(autoReleaseDays({ ESCROW_AUTO_RELEASE_DAYS: "soon" })).toBe(0);
  });
});

describe("sendSms", () => {
  it("does nothing (and does not throw) when SMS is not configured", async () => {
    await expect(sendSms("254712345678", "hi", { NODE_ENV: "test" })).resolves.toBe(false);
  });
});

describe("staff roles", () => {
  it("treats moderators and the super admin as staff", async () => {
    const { isStaff, MAX_MODERATORS } = await import("@/lib/roles");
    expect(isStaff("ADMIN")).toBe(true);
    expect(isStaff("SUPER_ADMIN")).toBe(true);
    expect(isStaff("BUYER")).toBe(false);
    expect(isStaff("TECHNICIAN")).toBe(false);
    expect(isStaff(undefined)).toBe(false);
    expect(MAX_MODERATORS).toBe(3);
  });
});

describe("listing condition details", () => {
  it("requires what works and what doesn't for used items", async () => {
    const { checkConditionDetails, hasNoFaults } = await import("@/lib/listing");
    expect(checkConditionDetails("NEW_SPARE")).toBeNull();
    expect(checkConditionDetails("USED_WORKING", "", "None")).toMatch(/what works/);
    expect(checkConditionDetails("USED_WORKING", "Powers on, all ports work", "")).toMatch(/doesn't work/);
    expect(checkConditionDetails("USED_WORKING", "Powers on, all ports work", "None")).toBeNull();
    expect(checkConditionDetails("USED_FOR_PARTS", "Motherboard works", "None")).toMatch(/for parts/);
    expect(checkConditionDetails("USED_FOR_PARTS", "Motherboard works", "Screen broken")).toBeNull();
    expect(hasNoFaults("none")).toBe(true);
  });

  it("recognises phone video formats by their bytes", async () => {
    const { sniffVideoType } = await import("@/lib/storage");
    const mp4 = new Uint8Array([0, 0, 0, 0x20, ...Buffer.from("ftypisom")]);
    const mov = new Uint8Array([0, 0, 0, 0x14, ...Buffer.from("ftypqt  ")]);
    expect(sniffVideoType(mp4)).toBe("video/mp4");
    expect(sniffVideoType(mov)).toBe("video/quicktime");
    expect(sniffVideoType(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]))).toBe("video/webm");
    expect(sniffVideoType(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
  });
});
