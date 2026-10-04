import { prisma } from "./db";

export async function storeRating(storeId: string) {
  const agg = await prisma.review.aggregate({ where: { storeId }, _avg: { rating: true }, _count: true });
  return { average: agg._avg?.rating ?? null, count: agg._count };
}
