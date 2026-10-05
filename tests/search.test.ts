import { describe, expect, it } from "vitest";
import { buildProductWhere, normalizePartNumber } from "@/lib/search";

describe("normalizePartNumber", () => {
  it("ignores case, spaces, dashes, dots and slashes", () => {
    expect(normalizePartNumber("bn44-00807a")).toBe("BN4400807A");
    expect(normalizePartNumber("BN44 00807 A")).toBe("BN4400807A");
    expect(normalizePartNumber("L14M4P23")).toBe("L14M4P23");
    expect(normalizePartNumber("715G6.338/P02")).toBe("715G6338P02");
  });
});

describe("buildProductWhere", () => {
  it("hides deleted products and unapproved stores, and applies filters", () => {
    expect(buildProductWhere({ category: "TV", condition: "USED_FOR_PARTS" })).toEqual({
      deletedAt: null,
      store: { status: "APPROVED" },
      category: "TV",
      condition: "USED_FOR_PARTS",
    });
  });

  it("matches every word by name or the whole query by part number", () => {
    const where = buildProductWhere({ q: "bn44-00807a" });
    expect(where.OR).toHaveLength(2);
    expect(where.OR?.[1]).toEqual({ partNumberKey: { contains: "BN4400807A" } });
  });

  it("skips the part number match for very short queries", () => {
    expect(buildProductWhere({ q: "tv" }).OR).toHaveLength(1);
  });
});

describe("price range", () => {
  it("filters by minimum and maximum price", () => {
    expect(buildProductWhere({ minPriceKes: 500, maxPriceKes: 2000 }).priceKes).toEqual({ gte: 500, lte: 2000 });
    expect(buildProductWhere({ maxPriceKes: 2000 }).priceKes).toEqual({ lte: 2000 });
    expect(buildProductWhere({}).priceKes).toBeUndefined();
  });
});

describe("video filter", () => {
  it("keeps only listings with a video", () => {
    expect(buildProductWhere({ withVideo: true }).videoUrl).toEqual({ not: null });
  });
});
