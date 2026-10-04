import Link from "next/link";
import { notFound } from "next/navigation";
import { addToCart } from "@/app/actions/cart";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { categoryLabels, conditionLabels, formatKes } from "@/lib/format";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, viewer] = await Promise.all([
    prisma.product.findFirst({ where: { id, deletedAt: null }, include: { store: true } }),
    getCurrentUser(),
  ]);
  if (!product) notFound();
  const isPublic = product.store.status === "APPROVED";
  if (!isPublic && viewer?.id !== product.store.ownerId && viewer?.role !== "ADMIN") notFound();

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <div className="card aspect-square overflow-hidden">
          {product.imageUrls[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrls[0]} alt={product.title} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-400">No photo</div>
          )}
        </div>
        {product.imageUrls.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {product.imageUrls.slice(1).map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="card aspect-square object-cover" />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-stone-500">
            <Link href={`/search?category=${product.category}`} className="hover:underline">
              {categoryLabels[product.category]}
            </Link>
          </p>
          <h1 className="text-2xl font-bold">{product.title}</h1>
          <p className="mt-2 text-2xl font-semibold text-brand-700">{formatKes(product.priceKes)}</p>
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
            <button className="btn-primary">Add to cart</button>
          </form>
        ) : product.stock <= 0 ? (
          <p className="text-sm font-medium text-red-700">This item is sold out.</p>
        ) : null}

        {product.description && <p className="whitespace-pre-line text-sm text-stone-700">{product.description}</p>}

        <div className="card p-4 text-sm">
          <p className="text-stone-500">Sold by</p>
          <Link href={`/stores/${product.store.slug}`} className="font-medium hover:text-brand-600">
            {product.store.name}
          </Link>
          {product.store.location && <p className="text-stone-500">{product.store.location}</p>}
          {isPublic && <p className="mt-1 text-xs text-green-700">✓ Identity verified by SparesHub</p>}
        </div>
      </div>
    </div>
  );
}
