import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { Stars } from "@/components/Stars";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storeRating } from "@/lib/reviews";
import { buildProductWhere } from "@/lib/search";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> };

export default async function StorePage({ params, searchParams }: Props) {
  const [{ slug }, { q }] = await Promise.all([params, searchParams]);
  const [store, viewer] = await Promise.all([prisma.store.findUnique({ where: { slug } }), getCurrentUser()]);
  if (!store) notFound();
  if (store.status !== "APPROVED" && viewer?.id !== store.ownerId && viewer?.role !== "ADMIN") notFound();
  const [rating, reviews] = await Promise.all([
    storeRating(store.id),
    prisma.review.findMany({
      where: { storeId: store.id },
      include: { buyer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  const products = await prisma.product.findMany({
    // Owners previewing an unapproved store still see their own listings.
    where: { ...buildProductWhere({ q, storeId: store.id }), store: undefined },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">{store.name}</h1>
        {store.status === "APPROVED" ? (
          <p className="text-xs text-green-700">✓ Identity verified by SparesHub</p>
        ) : (
          <p className="text-xs text-amber-700">Preview: not visible to buyers until approved</p>
        )}
        {store.location && <p className="text-sm text-stone-500">{store.location}</p>}
        <Stars rating={rating.average} count={rating.count} />
        {store.description && <p className="mt-2 max-w-2xl text-sm text-stone-700">{store.description}</p>}
      </div>
      <form action={`/stores/${store.slug}`} className="flex max-w-md">
        <input name="q" defaultValue={q} placeholder="Search this store" className="input rounded-r-none" />
        <button className="btn-secondary rounded-l-none">Search</button>
      </form>
      {products.length === 0 ? (
        <p className="text-sm text-stone-500">No listings found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
      {reviews.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Reviews</h2>
          <div className="card divide-y divide-stone-200 text-sm">
            {reviews.map((r) => (
              <div key={r.id} className="space-y-1 p-3">
                <div className="flex items-center gap-2">
                  <Stars rating={r.rating} />
                  <span className="text-xs text-stone-500">
                    {r.buyer.name.split(" ")[0]} · {r.createdAt.toLocaleDateString("en-KE")}
                  </span>
                </div>
                {r.comment && <p className="text-stone-700">{r.comment}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
