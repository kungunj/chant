import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRegistryProvider } from "@/lib/business-registry";
import { namesInCommon } from "@/lib/business-registry/match";
import {
  businessTypeLabels,
  displayPhone,
  documentKindLabels,
  idTypeLabels,
  nameCheckStatusLabels,
  registryStatusLabels,
  storeStatusLabels,
} from "@/lib/format";
import { IdNamesForm, MpesaNameActions, RegistryActions } from "./RegistryActions";
import { ReviewForm } from "./ReviewForm";

type RegistryDetails = {
  record?: { name: string; status: string; owners: string[]; registrationDate?: string };
  problems?: string[];
  note?: string;
  checkedBy?: string;
};

export default async function AdminStorePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      owner: true,
      documents: true,
      reviewedBy: { select: { name: true } },
      _count: { select: { products: true, orders: true } },
    },
  });
  if (!store) notFound();
  const registry = store.registryDetails as RegistryDetails | null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/admin" className="text-sm text-stone-500 hover:underline">
        ← Store approvals
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{store.name}</h1>
        <span className="badge text-sm">{storeStatusLabels[store.status]}</span>
      </div>

      <dl className="card grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 p-4 text-sm">
        <dt className="text-stone-500">Account</dt>
        <dd>
          {store.owner.name} · {store.owner.email} · {store.owner.phone ? displayPhone(store.owner.phone) : "no phone"}
        </dd>
        <dt className="text-stone-500">Legal name</dt>
        <dd>{store.legalName ?? "—"}</dd>
        <dt className="text-stone-500">Document</dt>
        <dd>{store.idType ? `${idTypeLabels[store.idType]} ${store.idNumber}` : "—"}</dd>
        <dt className="text-stone-500">KRA PIN</dt>
        <dd>{store.kraPin ?? "—"}</dd>
        <dt className="text-stone-500">Location</dt>
        <dd>{store.location ?? "—"}</dd>
        <dt className="text-stone-500">Registration fee</dt>
        <dd>{store.registrationFeePaidAt ? `Paid ${store.registrationFeePaidAt.toLocaleDateString("en-KE")}` : "Not paid"}</dd>
        <dt className="text-stone-500">Activity</dt>
        <dd>
          {store._count.products} products, {store._count.orders} orders
        </dd>
        {store.reviewedAt && (
          <>
            <dt className="text-stone-500">Last review</dt>
            <dd>
              {store.reviewedAt.toLocaleDateString("en-KE")} by {store.reviewedBy?.name ?? "SparesHub (automatic)"}
              {store.reviewNote && `: ${store.reviewNote}`}
            </dd>
          </>
        )}
      </dl>

      {store.sellerType === "INDIVIDUAL" ? (
        <div className="card space-y-3 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Individual seller: M-Pesa name check</h2>
            <span
              className={`badge ${
                store.mpesaNameStatus === "MATCHED" || store.mpesaNameStatus === "MANUALLY_VERIFIED"
                  ? "bg-green-100 text-green-800"
                  : store.mpesaNameStatus === "MISMATCH" || store.mpesaNameStatus === "ERROR"
                    ? "bg-red-100 text-red-800"
                    : ""
              }`}
            >
              {nameCheckStatusLabels[store.mpesaNameStatus]}
            </span>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
            <dt className="text-stone-500">Name typed by seller</dt>
            <dd>{store.legalName}</dd>
            <dt className="text-stone-500">Names on ID photo</dt>
            <dd>
              {store.idNamesRead ?? "not read yet"}
              {store.idNamesSource && <span className="text-stone-500"> (read by {store.idNamesSource})</span>}
            </dd>
            <dt className="text-stone-500">M-Pesa line</dt>
            <dd>{store.mpesaPhone ? displayPhone(store.mpesaPhone) : "—"}</dd>
            <dt className="text-stone-500">M-Pesa name</dt>
            <dd>{store.mpesaName ?? "—"}</dd>
            {store.idNamesRead && store.mpesaName && (
              <>
                <dt className="text-stone-500">Names in common</dt>
                <dd>{namesInCommon(store.idNamesRead, store.mpesaName)} (at least 2 needed)</dd>
              </>
            )}
          </dl>
          <p className="text-xs text-stone-500">
            Compare the names above with the ID photo below. If they were misread, correct them here.
          </p>
          <IdNamesForm storeId={store.id} current={store.idNamesRead} />
          <MpesaNameActions storeId={store.id} />
        </div>
      ) : (
        <div className="card space-y-3 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Registered business</h2>
            <span
              className={`badge ${
                store.registryStatus === "MATCHED" || store.registryStatus === "MANUALLY_VERIFIED"
                  ? "bg-green-100 text-green-800"
                  : store.registryStatus === "NOT_CHECKED"
                    ? ""
                    : "bg-red-100 text-red-800"
              }`}
            >
              {registryStatusLabels[store.registryStatus]}
            </span>
          </div>
          {store.businessType ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
              <dt className="text-stone-500">Type</dt>
              <dd>{businessTypeLabels[store.businessType]}</dd>
              <dt className="text-stone-500">Name entered</dt>
              <dd>{store.businessName}</dd>
              <dt className="text-stone-500">Registration no.</dt>
              <dd className="font-mono">{store.businessRegNo}</dd>
              {registry?.record && (
                <>
                  <dt className="text-stone-500">Registrar says</dt>
                  <dd>
                    {registry.record.name} · {registry.record.status}
                    {registry.record.registrationDate && ` · since ${registry.record.registrationDate}`}
                  </dd>
                  <dt className="text-stone-500">Owners / directors</dt>
                  <dd>{registry.record.owners.join(", ") || "not returned"}</dd>
                </>
              )}
              {store.registryCheckedAt && (
                <>
                  <dt className="text-stone-500">Checked</dt>
                  <dd>
                    {store.registryCheckedAt.toLocaleString("en-KE")} via {store.registrySource}
                    {registry?.note && ` by ${registry.checkedBy}: ${registry.note}`}
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p className="text-stone-500">No business details submitted.</p>
          )}
          {registry?.problems && registry.problems.length > 0 && (
            <ul className="list-disc rounded-md bg-red-50 p-3 pl-6 text-red-800">
              {registry.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          {store.businessType && <RegistryActions storeId={store.id} canRecheck={getRegistryProvider() !== null} />}
        </div>
      )}

      <div className="card p-4">
        <h2 className="mb-3 font-semibold">Documents</h2>
        {store.documents.length === 0 ? (
          <p className="text-sm text-stone-500">No documents uploaded.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {store.documents.map((d) => (
              <a
                key={d.id}
                href={`/api/documents/${d.id}`}
                target="_blank"
                rel="noreferrer"
                className="card block overflow-hidden hover:shadow"
              >
                {d.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/documents/${d.id}`}
                    alt={documentKindLabels[d.kind]}
                    className="h-48 w-full object-contain bg-stone-100"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-stone-100 text-sm text-stone-500">
                    PDF, click to open
                  </div>
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
