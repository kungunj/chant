import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatKes } from "@/lib/format";

export default async function AdminDisputesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const resolved = (await searchParams).status === "RESOLVED";
  const disputes = await prisma.dispute.findMany({
    where: { status: resolved ? "RESOLVED" : "OPEN" },
    include: {
      order: { include: { store: { select: { name: true } }, buyer: { select: { name: true } } } },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Link href="/admin/disputes" className={resolved ? "btn-secondary py-1" : "btn-primary py-1"}>Open</Link>
        <Link href="/admin/disputes?status=RESOLVED" className={resolved ? "btn-primary py-1" : "btn-secondary py-1"}>Resolved</Link>
      </div>
      {disputes.length === 0 ? (
        <p className="text-sm text-stone-500">No disputes.</p>
      ) : (
        <div className="card divide-y divide-stone-200 text-sm">
          {disputes.map((d) => (
            <Link key={d.id} href={`/disputes/${d.id}`} className="flex flex-wrap items-center gap-4 p-3 hover:bg-stone-50">
              <span className="flex-1">
                <strong>{d.order.buyer.name}</strong> vs <strong>{d.order.store.name}</strong>
                <span className="block truncate text-stone-500">{d.reason}</span>
              </span>
              <span>{formatKes(d.order.totalKes)}</span>
              <span className="text-xs text-stone-500">{d._count.messages} messages</span>
              <span className="text-xs text-stone-500">{d.createdAt.toLocaleDateString("en-KE")}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
