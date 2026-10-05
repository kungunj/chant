import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { buildProductWhere } from "@/lib/search";
import { buyerPrice } from "@/lib/pricing";

/** Search-as-you-type: a few matching listings for the dropdown under the search bar. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) return NextResponse.json([]);
  const products = await prisma.product.findMany({
    where: { ...buildProductWhere({ q }), stock: { gt: 0 } },
    select: { id: true, title: true, partNumber: true, priceKes: true, imageUrls: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  return NextResponse.json(
    products.map(({ imageUrls, priceKes, ...p }) => ({
      ...p,
      priceKes: buyerPrice(priceKes),
      image: imageUrls[0] ?? null,
    })),
    { headers: { "Cache-Control": "public, max-age=30" } },
  );
}
