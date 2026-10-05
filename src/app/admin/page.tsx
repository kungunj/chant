import Link from "next/link";
import type { StoreStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storeStatusLabels } from "@/lib/format";

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminStoresPage({ searchParams }: Props) {
  await requireAdmin();
  const { status: raw } = await searchParams;
  const status = (raw && raw in storeStatusLabels ? raw : "PENDING_REVIEW") as StoreStatus;
  const stores = await prisma.store.findMany({
    where: { status },
    include: { owner: { select: { name: true, email: true } }, _count: { select: { products: true } } },
    orderBy: { submittedAt: "asc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(storeStatusLabels) as StoreStatus[]).map((s) => (
          <Link key={s} href={`/admin?status=${s}`} className={s === status ? "btn-primary py-1" : "btn-secondary py-1"}>
            {storeStatusLabels[s]}
          </Link>
        ))}
      </div>
      {stores.length === 0 ? (
        <p className="text-sm text-stone-500">No stores here.</p>
      ) : (
        <div className="card divide-y divide-stone-200 text-sm">
          {stores.map((s) => (
            <Link key={s.id} href={`/admin/stores/${s.id}`} className="flex flex-wrap items-center gap-4 p-3 hover:bg-stone-50">
              <span className="flex-1">
                <strong>{s.name}</strong> <span className="text-stone-500">· {s.owner.name} ({s.owner.email})</span>
              </span>
              <span className="text-stone-500">{s._count.products} products</span>
              <span className="text-xs text-stone-500">
                {s.submittedAt ? `submitted ${s.submittedAt.toLocaleDateString("en-KE")}` : "not submitted"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
