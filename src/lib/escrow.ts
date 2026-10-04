import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

type Tx = Prisma.TransactionClient;

/** Commission SparesHub keeps from the seller's share, e.g. PLATFORM_COMMISSION_PERCENT=5. */
export function commissionFor(amountKes: number, percent = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? 0)) {
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.floor((amountKes * Math.min(percent, 100)) / 100);
}

/**
 * Splits an escrowed order between buyer and seller. `refundKes` goes back to the buyer's wallet,
 * the rest (minus commission) to the seller's wallet. Returns false if the escrow was already
 * settled, so it is safe against double clicks and races.
 */
export async function settleEscrow(
  tx: Tx,
  params: { orderId: string; refundKes: number; note: string },
): Promise<boolean> {
  const order = await tx.order.findUnique({ where: { id: params.orderId }, include: { store: true } });
  if (!order || order.escrowStatus !== "HELD") return false;

  const refund = Math.max(0, Math.min(order.totalKes, Math.floor(params.refundKes)));
  const sellerShare = order.totalKes - refund;
  const commission = commissionFor(sellerShare);
  const escrowStatus = refund === 0 ? "RELEASED" : refund === order.totalKes ? "REFUNDED" : "SPLIT";

  const claimed = await tx.order.updateMany({
    where: { id: order.id, escrowStatus: "HELD" },
    data: {
      escrowStatus,
      escrowSettledAt: new Date(),
      commissionKes: commission,
      status: refund === 0 ? "DELIVERED" : "REFUNDED",
    },
  });
  if (claimed.count === 0) return false;

  if (sellerShare - commission > 0) {
    await tx.walletEntry.create({
      data: {
        userId: order.store.ownerId,
        type: "ESCROW_RELEASE",
        amountKes: sellerShare - commission,
        orderId: order.id,
        note: commission > 0 ? `${params.note} (commission KSh ${commission})` : params.note,
      },
    });
  }
  if (refund > 0) {
    await tx.walletEntry.create({
      data: { userId: order.buyerId, type: "REFUND", amountKes: refund, orderId: order.id, note: params.note },
    });
  }
  return true;
}

/** Buyer confirmed delivery: all the money goes to the seller. */
export function releaseEscrow(orderId: string, note = "Buyer confirmed delivery") {
  return prisma.$transaction((tx) => settleEscrow(tx, { orderId, refundKes: 0, note }));
}
