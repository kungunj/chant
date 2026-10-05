import { describe, expect, it } from "vitest";
import { businessNamesMatch, isValidRegNo, normalizeRegNo, personIsOwner } from "@/lib/business-registry/match";

describe("registration numbers", () => {
  it("accepts current and older BRS formats for each business type", () => {
    expect(isValidRegNo("BUSINESS_NAME", "bn-abc1234")).toBe(true);
    expect(isValidRegNo("LIMITED_COMPANY", "PVT- AB12CD3")).toBe(true);
    expect(isValidRegNo("LIMITED_COMPANY", "CPR/2012/12345")).toBe(true);
    expect(isValidRegNo("LLP", "LLP-ABC123")).toBe(true);
  });
  it("rejects a number of the wrong type or shape", () => {
    expect(isValidRegNo("LIMITED_COMPANY", "BN-ABC1234")).toBe(false);
    expect(isValidRegNo("BUSINESS_NAME", "hello")).toBe(false);
    expect(normalizeRegNo(" pvt-ab 12 ")).toBe("PVT-AB12");
  });
});

describe("name matching", () => {
  it("treats Limited/Ltd, & /and and punctuation as the same", () => {
    expect(businessNamesMatch("Wanjiru Electronics Limited", "WANJIRU ELECTRONICS LTD.")).toBe(true);
    expect(businessNamesMatch("Kamau & Sons Enterprises", "Kamau and Sons Enterprise")).toBe(true);
    expect(businessNamesMatch("Wanjiru Electronics", "Wanjiru Spares")).toBe(false);
  });
  it("finds the seller among the registered owners by name", () => {
    expect(personIsOwner("Wanjiru Kamau", ["JANE WANJIRU KAMAU", "PETER OTIENO"])).toBe(true);
    expect(personIsOwner("Wanjiru Kamau", ["PETER OTIENO"])).toBe(false);
  });
});

describe("registry evaluation", () => {
  it("matches an active registration owned by the seller, and explains mismatches", async () => {
    const { evaluateRecord } = await import("@/lib/business-registry");
    const record = { regNo: "PVT-AB12CD3", name: "WANJIRU ELECTRONICS LIMITED", status: "registered", owners: ["WANJIRU KAMAU"] };
    expect(evaluateRecord(record, { businessName: "Wanjiru Electronics Ltd", legalName: "Wanjiru Kamau" }).status).toBe("MATCHED");
    const bad = evaluateRecord({ ...record, status: "Dissolved" }, { businessName: "Other Spares", legalName: "Peter Otieno" });
    expect(bad.status).toBe("MISMATCH");
    expect(bad.problems).toHaveLength(3);
  });

  it("calls Dojah with the BRS registration type and maps its response", async () => {
    const { dojahProvider } = await import("@/lib/business-registry/dojah");
    const calls: string[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: URL) => {
      calls.push(String(url));
      return new Response(
        JSON.stringify({ entity: { business_name: "X LTD", status: "registered", partners: [{ name: "A B", type: "director" }] } }),
        { status: 200 },
      );
    }) as typeof fetch;
    try {
      const result = await dojahProvider("app", "key").lookup("LIMITED_COMPANY", "PVT-AB12CD3");
      expect(calls[0]).toContain("registration_type=pvt");
      expect(result).toMatchObject({ kind: "found", record: { name: "X LTD", owners: ["A B"] } });
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe("M-Pesa name check", () => {
  it("needs at least two names in common between the ID photo and M-Pesa", async () => {
    const { mpesaNameMatches } = await import("@/lib/name-check");
    expect(mpesaNameMatches("JANE WANJIRU KAMAU", "JANE KAMAU")).toBe(true);
    expect(mpesaNameMatches("JANE WANJIRU KAMAU", "Wanjiru Kamau")).toBe(true);
    expect(mpesaNameMatches("JANE WANJIRU KAMAU", "JANE OTIENO")).toBe(false);
    expect(mpesaNameMatches("JANE WANJIRU KAMAU", "PETER OTIENO")).toBe(false);
  });

  it("reads the payer's name from Safaricom's Transaction Status result", async () => {
    const { parseTransactionStatusResult } = await import("@/lib/mpesa");
    const result = parseTransactionStatusResult({
      Result: {
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        ResultParameters: {
          ResultParameter: [
            { Key: "ReceiptNo", Value: "SJK1ABC234" },
            { Key: "DebitPartyName", Value: "254712345678 - JANE WANJIRU KAMAU" },
          ],
        },
      },
    });
    expect(result).toMatchObject({ receipt: "SJK1ABC234", resultCode: 0, payerName: "JANE WANJIRU KAMAU" });
  });

  it("collects the holder's names from the ID reader's fields", async () => {
    const { namesFromTextData } = await import("@/lib/id-reader");
    expect(
      namesFromTextData([
        { field_key: "surname", value: "KAMAU" },
        { field_key: "given_names", value: "JANE WANJIRU" },
        { field_key: "document_number", value: "12345678" },
        { field_key: "fathers_name", value: "JOSEPH" },
      ]),
    ).toBe("KAMAU JANE WANJIRU");
  });
});
