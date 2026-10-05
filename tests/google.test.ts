import { describe, expect, it } from "vitest";
import { decodeState, encodeState, googleAuthUrl, googleConfigured, profileFromClaims, safeNextPath } from "@/lib/google";

const env = { GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret", APP_URL: "https://shop.example/" };

describe("Google sign-in", () => {
  it("is off until both keys are set", () => {
    expect(googleConfigured({ GOOGLE_CLIENT_ID: "id" })).toBe(false);
    expect(googleConfigured(env)).toBe(true);
  });

  it("sends Google the callback on APP_URL and the state", () => {
    const url = new URL(googleAuthUrl("abc", env));
    expect(url.searchParams.get("redirect_uri")).toBe("https://shop.example/api/auth/google/callback");
    expect(url.searchParams.get("state")).toBe("abc");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
  });

  it("round-trips the saved state and rejects junk", () => {
    const saved = { state: "s", next: "/cart", seller: true };
    expect(decodeState(encodeState(saved))).toEqual(saved);
    expect(decodeState("not-json")).toBeNull();
    expect(decodeState(undefined)).toBeNull();
  });

  it("only returns to same-site paths", () => {
    expect(safeNextPath("/orders")).toBe("/orders");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });

  it("needs a verified email", () => {
    expect(profileFromClaims({ email: "A@Gmail.com", email_verified: true, name: "Ann Wairimu" })).toEqual({
      email: "a@gmail.com",
      name: "Ann Wairimu",
    });
    expect(profileFromClaims({ email: "a@gmail.com", email_verified: false })).toBeNull();
    expect(profileFromClaims({ email: "kim@gmail.com", email_verified: true })?.name).toBe("kim");
  });
});
