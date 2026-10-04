import type { Condition, DeviceCategory, Prisma } from "@prisma/client";

/** Normalise a part number so "BN44-00807A", "bn44 00807a" and "BN4400807A" all match. */
export function normalizePartNumber(value: string): string {
  return value.toUpperCase().replace(/[\s\-./_]/g, "");
}

export type SearchParams = {
  q?: string;
  category?: DeviceCategory;
  condition?: Condition;
  storeId?: string;
};

/**
 * Builds the product filter for a search. Every word in the query must match the title,
 * brand, model or description, OR the whole query must match a part number.
 */
export function buildProductWhere(params: SearchParams): Prisma.ProductWhereInput {
  // Only listings from stores an admin has approved are public.
  const where: Prisma.ProductWhereInput = { deletedAt: null, store: { status: "APPROVED" } };
  if (params.category) where.category = params.category;
  if (params.condition) where.condition = params.condition;
  if (params.storeId) where.storeId = params.storeId;

  const q = params.q?.trim();
  if (!q) return where;

  const words = q.split(/\s+/).filter(Boolean).slice(0, 8);
  const textMatch: Prisma.ProductWhereInput = {
    AND: words.map((word) => ({
      OR: [
        { title: { contains: word, mode: "insensitive" } },
        { brand: { contains: word, mode: "insensitive" } },
        { modelName: { contains: word, mode: "insensitive" } },
        { description: { contains: word, mode: "insensitive" } },
        { partNumber: { contains: word, mode: "insensitive" } },
      ],
    })),
  };

  const key = normalizePartNumber(q);
  const or: Prisma.ProductWhereInput[] = [textMatch];
  if (key.length >= 3) or.push({ partNumberKey: { contains: key } });

  where.OR = or;
  return where;
}
