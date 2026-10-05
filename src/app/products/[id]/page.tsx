import Link from "next/link";
import { notFound } from "next/navigation";
import { addToCart } from "@/app/actions/cart";
import { toggleSaved } from "@/app/actions/saved";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { TrackView } from "@/components/RecentlyViewed";
import { getCurrentUser } from "@/lib/auth";
import { Stars } from "@/components/Stars";
import { prisma } from "@/lib/db";
import { storeRating } from "@/lib/reviews";
import { categoryLabels, conditionLabels, formatKes } from "@/lib/format";
import { isStaff } from "@/lib/roles";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, viewer] = await Promise.all([
    prisma.product.findFirst({ where: { id, deletedAt: null }, include: { store: true } }),
    getCurrentUser(),
  ]);
  if (!product) notFound();
  const isPublic = product.store.status === "APPROVED";
  if (!isPublic && viewer?.id !== product.store.ownerId && !isStaff(viewer?.role)) notFound();
  const [rating, saved, similar] = await Promise.all([
    storeRating(product.storeId),
    viewer ? prisma.savedItem.findUnique({ where: { userId_productId: { userId: viewer.id, productId: product.id } } }) : null,
    isPublic
      ? prisma.product.findMany({
          where: {
            id: { not: product.id },
            deletedAt: null,
            stock: { gt: 0 },
            store: { status: "APPROVED" },
            OR: [
              ...(product.partNumberKey ? [{ partNumberKey: product.partNumberKey }] : []),
              ...(product.modelName ? [{ modelName: { equals: product.modelName, mode: "insensitive" as const } }] : []),
              { category: product.category, ...(product.brand ? { brand: product.brand } : {}) },
            ],
          },
          include: { store: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 4,
        })
      : [],
  ]);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {isPublic && (
        <TrackView
          item={{ id: product.id, title: product.title, priceKes: product.priceKes, image: product.imageUrls[0] ?? null }}
        />
      )}
      <ProductGallery urls={product.imageUrls} title={product.title} />

      <div className="space-y-4">
        <div>
          <p className="text-sm text-stone-500">
            <Link href={`/search?category=${product.category}`} className="hover:underline">
              {categoryLabels[product.category]}
            </Link>
          </p>
          <h1 className="text-2xl font-bold">{product.title}</h1>
          <p className="mt-2 text-2xl font-semibold text-accent-700">{formatKes(product.priceKes)}</p>
        </div>

        <dl className="card grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 p-4 text-sm">
          <dt className="text-stone-500">Condition</dt>
          <dd>{conditionLabels[product.condition]}</dd>
          {product.partNumber && (
            <>
              <dt className="text-stone-500">Part number</dt>
              <dd className="font-mono">{product.partNumber}</dd>
            </>
          )}
          {product.brand && (
            <>
              <dt className="text-stone-500">Brand</dt>
              <dd>{product.brand}</dd>
            </>
          )}
          {product.modelName && (
            <>
              <dt className="text-stone-500">Fits model</dt>
              <dd>{product.modelName}</dd>
            </>
          )}
          <dt className="text-stone-500">In stock</dt>
          <dd>{product.stock > 0 ? product.stock : "Sold out"}</dd>
        </dl>

        {!isPublic && (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            Preview: this listing goes public once SparesHub approves the store.
          </p>
        )}
        {product.stock > 0 && isPublic ? (
          <form action={addToCart} className="flex items-end gap-3">
            <input type="hidden" name="productId" value={product.id} />
            <div className="w-24">
              <label className="label" htmlFor="quantity">Quantity</label>
              <input id="quantity" name="quantity" type="number" min={1} max={product.stock} defaultValue={1} className="input" />
            </div>
            <button className="btn-accent">Add to cart</button>
          </form>
        ) : product.stock <= 0 ? (
          <p className="text-sm font-medium text-red-700">This item is sold out.</p>
        ) : null}

        {isPublic && (
          <form action={toggleSaved}>
            <input type="hidden" name="productId" value={product.id} />
            <button className="btn-secondary">{saved ? "♥ Saved" : "♡ Save for later"}</button>
          </form>
        )}

        {product.description && <p className="whitespace-pre-line text-sm text-stone-700">{product.description}</p>}

        <div className="card p-4 text-sm">
          <p className="text-stone-500">Sold by</p>
          <Link href={`/stores/${product.store.slug}`} className="font-medium hover:text-brand-600">
            {product.store.name}
          </Link>
          {product.store.location && <p className="text-stone-500">{product.store.location}</p>}
          <Stars rating={rating.average} count={rating.count} />
          {isPublic && <p className="mt-1 text-xs text-green-700">✓ Identity verified by SparesHub</p>}
          <p className="mt-2 text-xs text-stone-500">
            Delivery: {product.store.postaFeeKes !== null && `Posta Kenya ${formatKes(product.store.postaFeeKes)}`}
            {product.store.postaFeeKes !== null && product.store.fargoFeeKes !== null && " · "}
            {product.store.fargoFeeKes !== null && `Fargo Courier ${formatKes(product.store.fargoFeeKes)}`}
          </p>
          <p className="text-xs text-stone-500">Payment is held by SparesHub until you confirm delivery.</p>
        </div>
      </div>
      {similar.length > 0 && (
        <section className="md:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">Similar parts</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} storeName={p.store.name} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
