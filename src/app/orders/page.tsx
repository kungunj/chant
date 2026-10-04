import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatKes, orderStatusLabels } from "@/lib/format";

export default async function OrdersPage() {
  const user = await requireUser("/orders");
  const orders = await prisma.order.findMany({
    where: { buyerId: user.id },
    include: { store: { select: { name: true } }, items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">My orders</h1>
      {orders.length === 0 && <p className="text-sm text-stone-500">You have not ordered anything yet.</p>}
      <div className="card divide-y divide-stone-200">
        {orders.map((o) => (
          <Link key={o.id} href={`/orders/${o.id}`} className="flex flex-wrap items-center gap-4 p-4 hover:bg-stone-50">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{o.items.map((i) => i.title).join(", ")}</p>
              <p className="text-xs text-stone-500">
                {o.store.name} · {o.createdAt.toLocaleDateString("en-KE")}
              </p>
            </div>
            <span className="badge">{orderStatusLabels[o.status]}</span>
            <span className="w-28 text-right font-semibold">{formatKes(o.totalKes)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
