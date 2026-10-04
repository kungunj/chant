import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { prisma } from "@/lib/db";
import { buildProductWhere } from "@/lib/search";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> };

export default async function StorePage({ params, searchParams }: Props) {
  const [{ slug }, { q }] = await Promise.all([params, searchParams]);
  const store = await prisma.store.findUnique({ where: { slug } });
  if (!store) notFound();
  const products = await prisma.product.findMany({
    where: buildProductWhere({ q, storeId: store.id }),
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">{store.name}</h1>
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
