import { describe, expect, it } from "vitest";
import { normalizeKenyanPhone } from "@/lib/phone";

describe("normalizeKenyanPhone", () => {
  it.each([
    ["0712345678", "254712345678"],
    ["0712 345 678", "254712345678"],
    ["+254712345678", "254712345678"],
    ["254112345678", "254112345678"],
    ["0112-345-678", "254112345678"],
    ["712345678", "254712345678"],
  ])("normalises %s", (input, expected) => {
    expect(normalizeKenyanPhone(input)).toBe(expected);
  });

  it.each(["", "0812345678", "07123", "+255712345678"])("rejects %s", (input) => {
    expect(normalizeKenyanPhone(input)).toBeNull();
  });
});
