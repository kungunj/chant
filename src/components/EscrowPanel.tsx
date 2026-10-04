import Link from "next/link";
import type { Dispute, Order } from "@prisma/client";
import { confirmDelivery } from "@/app/actions/orders";
import { escrowStatusLabels, formatKes } from "@/lib/format";
import { ConfirmDeliveryButton } from "./ConfirmDeliveryButton";
import { OpenDisputeForm } from "./OpenDisputeForm";

/** Shows where the buyer's money is and the actions that move it, for buyer or seller. */
export function EscrowPanel({ order, role }: { order: Order & { dispute: Dispute | null }; role: "buyer" | "seller" }) {
  if (!order.escrowStatus) return null;
  const held = order.escrowStatus === "HELD";
  const disputeOpen = order.dispute?.status === "OPEN";

  return (
    <div className="card space-y-3 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Payment protection</h2>
        <span className={`badge ${held ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
          {escrowStatusLabels[order.escrowStatus]}
        </span>
      </div>

      {held && !disputeOpen && (
        <p className="text-stone-600">
          {role === "buyer"
            ? `Your ${formatKes(order.totalKes)} is held by SparesHub. It is only released to the seller when you confirm you received the item.`
            : `The buyer's ${formatKes(order.totalKes)} is held by SparesHub and moves to your wallet when they confirm delivery.`}
        </p>
      )}
      {!held && order.escrowStatus === "RELEASED" && (
        <p className="text-stone-600">
          Released to the seller{order.commissionKes > 0 && ` (SparesHub commission ${formatKes(order.commissionKes)})`}.
        </p>
      )}
      {!held && order.dispute?.refundKes != null && order.dispute.refundKes > 0 && (
        <p className="text-stone-600">
          {formatKes(order.dispute.refundKes)} refunded to the buyer&apos;s wallet, {formatKes(order.totalKes - order.dispute.refundKes)} to the seller.
        </p>
      )}

      {role === "buyer" && held && !disputeOpen && order.status === "SHIPPED" && (
        <form action={confirmDelivery}>
          <input type="hidden" name="orderId" value={order.id} />
          <ConfirmDeliveryButton amount={formatKes(order.totalKes)} />
        </form>
      )}

      {order.dispute ? (
        <Link href={`/disputes/${order.dispute.id}`} className={disputeOpen ? "btn-danger" : "btn-secondary"}>
          {disputeOpen ? "Dispute open: go to chat with moderator" : "View resolved dispute"}
        </Link>
      ) : (
        held && <OpenDisputeForm orderId={order.id} role={role} />
      )}
    </div>
  );
}
