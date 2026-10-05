import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { prisma } from "@/lib/db";
import { categoryLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const latest = await prisma.product.findMany({
    where: { deletedAt: null, stock: { gt: 0 }, store: { status: "APPROVED" } },
    include: { store: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return (
    <div className="space-y-10">
      <section className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 px-6 py-10 text-white">
        <h1 className="max-w-2xl text-3xl font-bold">Spares and used parts for dead electronics</h1>
        <p className="mt-2 max-w-2xl text-brand-100">
          Technicians across Kenya selling boards, screens, hinges, chips and whole units for parts. Search by name or
          part number, pay with M-Pesa and track delivery by Posta Kenya or Fargo Courier.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/search" className="btn bg-white text-brand-700 hover:bg-brand-50">Browse all parts</Link>
          <Link href="/dashboard" className="btn border border-white/60 text-white hover:bg-white/10">
            Open your store
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Shop by device</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryLabels).map(([value, label]) => (
            <Link key={value} href={`/search?category=${value}`} className="btn-secondary">
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Just listed</h2>
        {latest.length === 0 ? (
          <p className="text-sm text-stone-500">No listings yet. Technicians can sign up and post the first parts.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {latest.map((p) => (
              <ProductCard key={p.id} product={p} storeName={p.store.name} />
            ))}
          </div>
        )}
      </section>

      <RecentlyViewed />
    </div>
  );
}
