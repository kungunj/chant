import Link from "next/link";
import { updateCartItem } from "@/app/actions/cart";
import { readCart } from "@/lib/cart";
import { prisma } from "@/lib/db";
import { formatKes } from "@/lib/format";

export default async function CartPage() {
  const cart = await readCart();
  const products = await prisma.product.findMany({
    where: { id: { in: Object.keys(cart) }, deletedAt: null, store: { status: "APPROVED" } },
    include: { store: { select: { name: true } } },
  });
  const total = products.reduce((sum, p) => sum + p.priceKes * cart[p.id], 0);

  if (products.length === 0) {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <p className="mb-4 text-stone-600">Your cart is empty.</p>
        <Link href="/search" className="btn-primary">Find parts</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Cart</h1>
      <div className="card divide-y divide-stone-200">
        {products.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <Link href={`/products/${p.id}`} className="font-medium hover:text-brand-600">{p.title}</Link>
              <p className="text-xs text-stone-500">{p.store.name}</p>
              {p.stock < cart[p.id] && <p className="text-xs text-red-700">Only {p.stock} left</p>}
            </div>
            <form action={updateCartItem} className="flex items-center gap-2">
              <input type="hidden" name="productId" value={p.id} />
              <input name="quantity" type="number" min={0} max={99} defaultValue={cart[p.id]} className="input w-20" />
              <button className="btn-secondary">Update</button>
            </form>
            <p className="w-28 text-right font-semibold">{formatKes(p.priceKes * cart[p.id])}</p>
            <form action={updateCartItem}>
              <input type="hidden" name="productId" value={p.id} />
              <input type="hidden" name="quantity" value="0" />
              <button className="text-sm text-stone-500 hover:text-red-700">Remove</button>
            </form>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-lg">
          Total <strong>{formatKes(total)}</strong>
        </p>
        <Link href="/checkout" className="btn-primary">Checkout</Link>
      </div>
    </div>
  );
}
