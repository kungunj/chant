import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { displayPhone, documentKindLabels, idTypeLabels, storeStatusLabels } from "@/lib/format";
import { ReviewForm } from "./ReviewForm";

export default async function AdminStorePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const store = await prisma.store.findUnique({
    where: { id },
    include: { owner: true, documents: true, reviewedBy: { select: { name: true } }, _count: { select: { products: true, orders: true } } },
  });
  if (!store) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/admin" className="text-sm text-stone-500 hover:underline">← Store approvals</Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{store.name}</h1>
        <span className="badge text-sm">{storeStatusLabels[store.status]}</span>
      </div>

      <dl className="card grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 p-4 text-sm">
        <dt className="text-stone-500">Account</dt>
        <dd>{store.owner.name} · {store.owner.email} · {store.owner.phone ? displayPhone(store.owner.phone) : "no phone"}</dd>
        <dt className="text-stone-500">Legal name</dt>
        <dd>{store.legalName ?? "—"}</dd>
        <dt className="text-stone-500">Document</dt>
        <dd>{store.idType ? `${idTypeLabels[store.idType]} ${store.idNumber}` : "—"}</dd>
        <dt className="text-stone-500">KRA PIN</dt>
        <dd>{store.kraPin ?? "—"}</dd>
        <dt className="text-stone-500">Location</dt>
        <dd>{store.location ?? "—"}</dd>
        <dt className="text-stone-500">Activity</dt>
        <dd>{store._count.products} products, {store._count.orders} orders</dd>
        {store.reviewedAt && (
          <>
            <dt className="text-stone-500">Last review</dt>
            <dd>
              {store.reviewedAt.toLocaleDateString("en-KE")} by {store.reviewedBy?.name}
              {store.reviewNote && `: ${store.reviewNote}`}
            </dd>
          </>
        )}
      </dl>

      <div className="card p-4">
        <h2 className="mb-3 font-semibold">Documents</h2>
        {store.documents.length === 0 ? (
          <p className="text-sm text-stone-500">No documents uploaded.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {store.documents.map((d) => (
              <a key={d.id} href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer" className="card block overflow-hidden hover:shadow">
                {d.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/documents/${d.id}`} alt={documentKindLabels[d.kind]} className="h-48 w-full object-contain bg-stone-100" />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-stone-100 text-sm text-stone-500">PDF, click to open</div>
                )}
                <p className="p-2 text-sm">{documentKindLabels[d.kind]}</p>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4">
        <h2 className="mb-3 font-semibold">Decision</h2>
        <ReviewForm storeId={store.id} status={store.status} />
      </div>
    </div>
  );
}
