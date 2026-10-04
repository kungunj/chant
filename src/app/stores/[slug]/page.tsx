import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildProductWhere } from "@/lib/search";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> };

export default async function StorePage({ params, searchParams }: Props) {
  const [{ slug }, { q }] = await Promise.all([params, searchParams]);
  const [store, viewer] = await Promise.all([prisma.store.findUnique({ where: { slug } }), getCurrentUser()]);
  if (!store) notFound();
  if (store.status !== "APPROVED" && viewer?.id !== store.ownerId && viewer?.role !== "ADMIN") notFound();
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
    </div>
  );
}
