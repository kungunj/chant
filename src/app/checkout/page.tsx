import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { readCart } from "@/lib/cart";
import { prisma } from "@/lib/db";
import { formatKes } from "@/lib/format";
import { CheckoutForm } from "./CheckoutForm";

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const cart = await readCart();
  const products = await prisma.product.findMany({
    where: { id: { in: Object.keys(cart) }, deletedAt: null, store: { status: "APPROVED" } },
    include: { store: { select: { name: true } } },
  });
  if (products.length === 0) redirect("/cart");
  const total = products.reduce((sum, p) => sum + p.priceKes * cart[p.id], 0);
  const stores = new Set(products.map((p) => p.storeId)).size;

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_300px]">
      <div>
        <h1 className="mb-4 text-2xl font-bold">Checkout</h1>
        <CheckoutForm name={user.name} phone={user.phone ? `0${user.phone.slice(3)}` : ""} total={formatKes(total)} />
      </div>
      <aside className="card h-fit space-y-2 p-4 text-sm">
        <h2 className="font-semibold">Order summary</h2>
        {products.map((p) => (
          <div key={p.id} className="flex justify-between gap-2">
            <span className="truncate">{cart[p.id]} × {p.title}</span>
            <span className="shrink-0">{formatKes(p.priceKes * cart[p.id])}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-stone-200 pt-2 font-semibold">
          <span>Total</span>
          <span>{formatKes(total)}</span>
        </div>
        {stores > 1 && (
          <p className="text-xs text-stone-500">
            Items come from {stores} stores, so they will ship as {stores} separate parcels. Delivery fees are agreed with each seller.
          </p>
        )}
      </aside>
    </div>
  );
}
