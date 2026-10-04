import { prisma } from "./db";

export const MIN_WITHDRAWAL_KES = 50;

export async function walletBalance(userId: string, tx: Pick<typeof prisma, "walletEntry"> = prisma) {
  const sum = await tx.walletEntry.aggregate({ where: { userId }, _sum: { amountKes: true } });
  return sum._sum.amountKes ?? 0;
}

/** Money buyers have paid for this seller's orders that is still waiting in escrow. */
export async function heldInEscrowForSeller(userId: string) {
  const sum = await prisma.order.aggregate({
    where: { store: { ownerId: userId }, escrowStatus: "HELD" },
    _sum: { totalKes: true },
  });
  return sum._sum.totalKes ?? 0;
}

/**
 * Debits the wallet and records a withdrawal for an admin to pay out. A per-user advisory lock
 * stops two simultaneous requests from spending the same balance.
 */
export async function requestWithdrawal(userId: string, amountKes: number, phone: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    const balance = await walletBalance(userId, tx);
    if (amountKes > balance) throw new WithdrawalError(`You can withdraw at most KSh ${balance.toLocaleString("en-KE")}`);
    const withdrawal = await tx.withdrawal.create({ data: { userId, amountKes, phone } });
    await tx.walletEntry.create({
      data: { userId, type: "WITHDRAWAL", amountKes: -amountKes, withdrawalId: withdrawal.id },
    });
    return withdrawal;
  });
}

export class WithdrawalError extends Error {}
