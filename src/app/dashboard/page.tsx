import Link from "next/link";
import { deleteProduct } from "@/app/actions/store";
import { requireStore } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { conditionLabels, formatKes, orderStatusLabels } from "@/lib/format";
import { retryNameCheck } from "@/app/actions/verification";
import { SubmitButton } from "@/components/SubmitButton";
import { buyerPrice } from "@/lib/pricing";
import { DeleteProductButton } from "./DeleteProductButton";

export default async function DashboardPage() {
  const { store } = await requireStore();
  const [products, orders] = await Promise.all([
    prisma.product.findMany({ where: { storeId: store.id, deletedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.order.findMany({
      where: { storeId: store.id, status: { not: "PENDING_PAYMENT" } },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const toShip = orders.filter((o) => o.status === "PAID");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <p className="text-sm text-stone-500">
            <Link href={`/stores/${store.slug}`} className="hover:underline">View public store</Link> ·{" "}
            <Link href="/dashboard/store" className="hover:underline">Edit store details</Link> ·{" "}
            <Link href="/wallet" className="hover:underline">Wallet</Link>
          </p>
        </div>
        <Link href="/dashboard/products/new" className="btn-primary">+ Post a product</Link>
      </div>

      {store.status !== "APPROVED" && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            store.status === "PENDING_REVIEW" ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"
          }`}
        >
          {store.status === "DRAFT" && (
            <>
              <strong>Your store is not public yet.</strong> Get verified so buyers can see your products.{" "}
              <Link href="/dashboard/verification" className="font-medium underline">Get verified</Link>
            </>
          )}
          {store.status === "PENDING_REVIEW" && (
            <>
              {store.registrationFeePaidAt ? (
                <>
                  <strong>Documents received.</strong> A SparesHub moderator is reviewing your store. Your products
                  go live as soon as it is approved.
                </>
              ) : (
                <form action={retryNameCheck} className="flex flex-wrap items-center gap-2">
                  <span>
                    <strong>Pay the registration fee</strong> to finish signing up.
                  </span>
                  <input
                    name="mpesaPhone"
                    aria-label="M-Pesa number"
                    defaultValue={store.mpesaPhone ? `0${store.mpesaPhone.slice(3)}` : ""}
                    placeholder="0712 345 678"
                    className="input w-40"
                  />
                  <SubmitButton className="btn-mpesa" pendingText="Sending M-Pesa prompt…">
                    Pay by M-Pesa
                  </SubmitButton>
                </form>
              )}
            </>
          )}
          {store.status === "REJECTED" && (
            <>
              <strong>Verification rejected:</strong> {store.reviewNote}{" "}
              <Link href="/dashboard/verification" className="font-medium underline">Submit again</Link>
            </>
          )}
          {store.status === "SUSPENDED" && (
            <>
              <strong>Your store is suspended</strong> and hidden from buyers: {store.reviewNote} Contact SparesHub
              support to resolve this.
            </>
          )}
        </div>
      )}

      {toShip.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <strong>{toShip.length}</strong> paid {toShip.length === 1 ? "order needs" : "orders need"} shipping.
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-stone-500">No paid orders yet.</p>
        ) : (
          <div className="card divide-y divide-stone-200">
            {orders.map((o) => (
              <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="flex flex-wrap items-center gap-4 p-3 text-sm hover:bg-stone-50">
                <span className="min-w-0 flex-1 truncate">{o.items.map((i) => `${i.quantity} × ${i.title}`).join(", ")}</span>
                <span className="text-stone-500">{o.shippingTown}</span>
                <span className={`badge ${o.status === "PAID" ? "bg-amber-100 text-amber-800" : ""}`}>
                  {o.status === "PAID" ? "Ship now" : orderStatusLabels[o.status]}
                </span>
                <span className="w-24 text-right font-medium">{formatKes(o.totalKes)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Your products ({products.length})</h2>
        {products.length === 0 ? (
          <p className="text-sm text-stone-500">You have not posted any products yet.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 text-xs uppercase text-stone-500">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">Part no.</th>
                  <th className="p-3">Condition</th>
                  <th className="p-3 text-right">Your price</th>
                  <th className="p-3 text-right">Stock</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3">
                      <Link href={`/products/${p.id}`} className="hover:text-brand-600">{p.title}</Link>
                    </td>
                    <td className="p-3 font-mono text-xs">{p.partNumber ?? "—"}</td>
                    <td className="p-3">{conditionLabels[p.condition]}</td>
                    <td className="p-3 text-right">
                      {formatKes(p.priceKes)}
                      <span className="block text-xs text-stone-500">buyers see {formatKes(buyerPrice(p.priceKes))}</span>
                    </td>
                    <td className="p-3 text-right">{p.stock}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/products/${p.id}/edit`} className="btn-secondary px-3 py-1">Edit</Link>
                        <form action={deleteProduct}>
                          <input type="hidden" name="productId" value={p.id} />
                          <DeleteProductButton title={p.title} />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
