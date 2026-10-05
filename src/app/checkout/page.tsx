import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { readCart } from "@/lib/cart";
import { prisma } from "@/lib/db";
import { displayPhone } from "@/lib/format";
import { buyerPrice } from "@/lib/pricing";
import { CheckoutForm, type CheckoutStore } from "./CheckoutForm";

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const cart = await readCart();
  const products = await prisma.product.findMany({
    where: { id: { in: Object.keys(cart) }, deletedAt: null, store: { status: "APPROVED" } },
    include: { store: true },
  });
  if (products.length === 0) redirect("/cart");

  const stores = new Map<string, CheckoutStore>();
  for (const p of products) {
    const entry = stores.get(p.storeId) ?? {
      id: p.storeId,
      name: p.store.name,
      postaFeeKes: p.store.postaFeeKes,
      fargoFeeKes: p.store.fargoFeeKes,
      items: [],
    };
    entry.items.push({ id: p.id, title: p.title, quantity: cart[p.id], lineKes: buyerPrice(p.priceKes) * cart[p.id] });
    stores.set(p.storeId, entry);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-2xl font-bold">Checkout</h1>
      <CheckoutForm name={user.name} phone={user.phone ? displayPhone(user.phone) : ""} stores={[...stores.values()]} />
    </div>
  );
}
