import { describe, expect, it } from "vitest";
import { darajaTimestamp, getMpesaConfig, parseStkCallback, stkPassword } from "@/lib/mpesa";

describe("darajaTimestamp", () => {
  it("formats in Kenyan time (UTC+3)", () => {
    expect(darajaTimestamp(new Date("2026-01-31T22:05:09Z"))).toBe("20260201010509");
  });
});

describe("stkPassword", () => {
  it("base64 encodes shortcode + passkey + timestamp", () => {
    expect(Buffer.from(stkPassword("174379", "key", "20260101000000"), "base64").toString()).toBe(
      "174379key20260101000000",
    );
  });
});

describe("getMpesaConfig", () => {
  it("defaults to sandbox and appends the callback token", () => {
    const config = getMpesaConfig({ APP_URL: "https://shop.example/", MPESA_CALLBACK_TOKEN: "s3cret" });
    expect(config.baseUrl).toBe("https://sandbox.safaricom.co.ke");
    expect(config.callbackUrl).toBe("https://shop.example/api/mpesa/callback?token=s3cret");
    expect(config.mock).toBe(false);
  });

  it("uses the production host when asked", () => {
    expect(getMpesaConfig({ MPESA_ENV: "production" }).baseUrl).toBe("https://api.safaricom.co.ke");
  });
});

describe("parseStkCallback", () => {
  it("reads a successful callback", () => {
    const parsed = parseStkCallback({
      Body: {
        stkCallback: {
          MerchantRequestID: "29115-34620561-1",
          CheckoutRequestID: "ws_CO_191220191020363925",
          ResultCode: 0,
          ResultDesc: "The service request is processed successfully.",
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: 1500 },
              { Name: "MpesaReceiptNumber", Value: "NLJ7RT61SV" },
              { Name: "TransactionDate", Value: 20191219102115 },
              { Name: "PhoneNumber", Value: 254708374149 },
            ],
          },
        },
      },
    });
    expect(parsed).toEqual({
      merchantRequestId: "29115-34620561-1",
      checkoutRequestId: "ws_CO_191220191020363925",
      resultCode: 0,
      resultDesc: "The service request is processed successfully.",
      amount: 1500,
      receipt: "NLJ7RT61SV",
      phone: "254708374149",
    });
  });

  it("reads a cancelled callback without metadata", () => {
    const parsed = parseStkCallback({
      Body: { stkCallback: { MerchantRequestID: "1", CheckoutRequestID: "ws_CO_1", ResultCode: 1032, ResultDesc: "Request cancelled by user" } },
    });
    expect(parsed?.resultCode).toBe(1032);
    expect(parsed?.receipt).toBeUndefined();
  });

  it("rejects malformed bodies", () => {
    expect(parseStkCallback(null)).toBeNull();
    expect(parseStkCallback({ Body: {} })).toBeNull();
  });
});
