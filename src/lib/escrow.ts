import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { notify } from "./notify";

type Tx = Prisma.TransactionClient;

/**
 * The part of the order's markup SparesHub keeps: all of it when the seller gets the whole order,
 * none when the buyer is refunded in full, and a proportional share when a dispute splits the money.
 */
export function commissionFor(order: { totalKes: number; markupKes: number }, sellerShareKes: number) {
  if (order.totalKes <= 0 || sellerShareKes <= 0) return 0;
  if (sellerShareKes >= order.totalKes) return order.markupKes;
  return Math.floor((order.markupKes * sellerShareKes) / order.totalKes);
}

/**
 * Splits an escrowed order between buyer and seller. `refundKes` goes back to the buyer's wallet,
 * the rest (minus SparesHub's markup) to the seller's wallet. Returns false if the escrow was already
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
  const commission = commissionFor(order, sellerShare);
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
        note: commission > 0 ? `${params.note} (SparesHub fee KSh ${commission})` : params.note,
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

/** Buyer confirmed delivery (or the auto-release timer ran out): all the money goes to the seller. */
export async function releaseEscrow(orderId: string, note = "Buyer confirmed delivery") {
  const released = await prisma.$transaction((tx) => settleEscrow(tx, { orderId, refundKes: 0, note }));
  if (released) {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { store: true } });
    await notify(order.store.ownerId, {
      title: "Payment released",
      body: `KSh ${(order.totalKes - order.commissionKes).toLocaleString("en-KE")} added to your wallet (${note.toLowerCase()}).`,
      link: "/wallet",
      sms: true,
    });
  }
  return released;
}

/** Days after a "delivered" mark before escrow releases itself; 0 disables it. */
export function autoReleaseDays(env: Record<string, string | undefined> = process.env) {
  const days = Number(env.ESCROW_AUTO_RELEASE_DAYS ?? 7);
  return Number.isFinite(days) && days > 0 ? days : 0;
}

/**
 * Releases escrow on shipped orders whose auto-release time has passed, unless a dispute is open.
 * Run from a scheduler via /api/cron/escrow.
 */
export async function runAutoRelease(now = new Date()) {
  const due = await prisma.order.findMany({
    where: {
      escrowStatus: "HELD",
      status: "SHIPPED",
      autoReleaseAt: { lte: now },
      OR: [{ dispute: null }, { dispute: { status: "RESOLVED" } }],
    },
    select: { id: true },
    take: 200,
  });
  let released = 0;
  for (const { id } of due) {
    if (await releaseEscrow(id, "Released automatically: buyer did not confirm or dispute in time")) released++;
  }
  return { due: due.length, released };
}

/**
 * Cancels a paid order that has not shipped: full refund to the buyer's wallet and stock returned.
 */
export async function cancelPaidOrder(orderId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.status !== "PAID") return false;
    if (!(await settleEscrow(tx, { orderId, refundKes: order.totalKes, note: `Order cancelled: ${reason}` }))) return false;
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason } });
    for (const item of order.items) {
      await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    }
    return true;
  });
}
