import Link from "next/link";
import { toggleSaved } from "@/app/actions/saved";
import { ProductCard } from "@/components/ProductCard";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function SavedPage() {
  const user = await requireUser("/saved");
  const saved = await prisma.savedItem.findMany({
    where: { userId: user.id, product: { deletedAt: null } },
    include: { product: { include: { store: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Saved items</h1>
      <p className="text-sm text-stone-600">We&apos;ll send you an alert if the price of a saved item drops.</p>
      {saved.length === 0 ? (
        <div className="card p-6 text-sm text-stone-600">
          Nothing saved yet. Tap <strong>♡ Save</strong> on any listing to keep it here.{" "}
          <Link href="/search" className="text-brand-600 hover:underline">Browse parts</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {saved.map(({ product }) => (
            <div key={product.id} className="space-y-1">
              <ProductCard product={product} storeName={product.store.name} />
              <form action={toggleSaved}>
                <input type="hidden" name="productId" value={product.id} />
                <button className="text-xs text-stone-500 hover:text-red-700">Remove</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
