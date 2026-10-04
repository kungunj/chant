import { prisma } from "./db";

/**
 * Records the outcome of an STK push. Safe to call more than once (callback and status
 * query can race): only the first call for a still-pending payment has any effect.
 */
export async function settlePayment(params: {
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  receipt?: string;
  amount?: number;
}) {
  const payment = await prisma.payment.findUnique({
    where: { checkoutRequestId: params.checkoutRequestId },
    include: { orders: { include: { items: true } } },
  });
  if (!payment) return null;
  if (payment.status !== "PENDING") {
    // A status query may have settled the payment before the callback brought the receipt number.
    if (payment.status === "SUCCESS" && !payment.mpesaReceipt && params.receipt) {
      return prisma.payment.update({ where: { id: payment.id }, data: { mpesaReceipt: params.receipt } });
    }
    return payment;
  }

  const paidInFull = params.amount === undefined || params.amount >= payment.amountKes;
  const success = params.resultCode === 0 && paidInFull;
  const status = success ? "SUCCESS" : params.resultCode === 1032 ? "CANCELLED" : "FAILED";

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: {
        status,
        resultCode: params.resultCode,
        resultDesc: paidInFull ? params.resultDesc : `Underpaid: received ${params.amount}`,
        mpesaReceipt: params.receipt ?? null,
      },
    });
    if (claimed.count === 0 || !success) return;

    for (const order of payment.orders) {
      await tx.order.update({ where: { id: order.id }, data: { status: "PAID" } });
      for (const item of order.items) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: 0 } });
        }
      }
    }
  });

  return prisma.payment.findUnique({ where: { id: payment.id } });
}
