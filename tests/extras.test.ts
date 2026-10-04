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
