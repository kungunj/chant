import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessDispute } from "@/lib/disputes";
import { escrowStatusLabels, formatKes } from "@/lib/format";
import { AutoRefresh, MessageForm, ResolveForm } from "./DisputeClient";
import { isStaff } from "@/lib/roles";

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/disputes/${id}`);
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      order: { include: { store: true, buyer: { select: { name: true } }, items: true } },
      messages: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!dispute || !canAccessDispute(user, dispute)) notFound();

  const { order } = dispute;
  const isAdmin = isStaff(user.role);
  const roleOf = (authorId: string, role: string) =>
    isStaff(role) ? "Moderator" : authorId === order.buyerId ? "Buyer" : authorId === order.store.ownerId ? "Seller" : "";
  const orderLink = isAdmin || order.store.ownerId === user.id ? `/dashboard/orders/${order.id}` : `/orders/${order.id}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {dispute.status === "OPEN" && <AutoRefresh />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Dispute</h1>
        <span className={`badge text-sm ${dispute.status === "OPEN" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
          {dispute.status === "OPEN" ? "Open, waiting for moderator" : "Resolved"}
        </span>
      </div>

      <div className="card grid gap-1 p-4 text-sm sm:grid-cols-2">
        <p>Buyer: <strong>{order.buyer.name}</strong></p>
        <p>Seller: <strong>{order.store.name}</strong></p>
        <p>Order: {order.items.map((i) => `${i.quantity} × ${i.title}`).join(", ")}</p>
        <p>
          {formatKes(order.totalKes)} · {order.escrowStatus ? escrowStatusLabels[order.escrowStatus] : ""}
        </p>
        {!isAdmin && (
          <Link href={orderLink} className="text-brand-600 hover:underline">View order</Link>
        )}
      </div>

      <div className="card space-y-3 p-4">
        {dispute.messages.map((m) =>
          m.author ? (
            <div key={m.id} className={`flex ${m.author.id === user.id ? "justify-end" : ""}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  isStaff(m.author.role)
                    ? "border border-blue-200 bg-blue-50"
                    : m.author.id === user.id
                      ? "bg-brand-50"
                      : "bg-stone-100"
                }`}
              >
                <p className="text-xs font-medium text-stone-500">
                  {m.author.name} · {roleOf(m.author.id, m.author.role)} ·{" "}
                  {m.createdAt.toLocaleString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "short", timeStyle: "short" })}
                </p>
                <p className="whitespace-pre-line">{m.body}</p>
              </div>
            </div>
          ) : (
            <p key={m.id} className="text-center text-xs text-stone-500">{m.body}</p>
          ),
        )}
        {dispute.status === "OPEN" ? (
          <div className="border-t border-stone-200 pt-3">
            <MessageForm disputeId={dispute.id} />
          </div>
        ) : (
          <p className="border-t border-stone-200 pt-3 text-sm text-stone-600">
            This dispute was resolved
            {dispute.resolvedAt && ` on ${dispute.resolvedAt.toLocaleDateString("en-KE")}`}.
          </p>
        )}
      </div>

      {isAdmin && dispute.status === "OPEN" && (
        <div className="card space-y-3 border-blue-200 p-4">
          <h2 className="font-semibold">Moderator decision</h2>
          <ResolveForm disputeId={dispute.id} total={order.totalKes} />
        </div>
      )}
    </div>
  );
}
