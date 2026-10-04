import { prisma } from "./db";
import { notify } from "./notify";

/**
 * Records the outcome of an STK push. On success the orders become PAID and the money is held in
 * escrow until the buyer confirms delivery (see escrow.ts).
 * Safe to call more than once (callback and status
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
    include: { orders: { include: { items: true, store: { select: { ownerId: true } } } } },
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

  const settledPaid = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: {
        status,
        resultCode: params.resultCode,
        resultDesc: paidInFull ? params.resultDesc : `Underpaid: received ${params.amount}`,
        mpesaReceipt: params.receipt ?? null,
      },
    });
    if (claimed.count === 0 || !success) return false;

    for (const order of payment.orders) {
      const marked = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING_PAYMENT" },
        data: { status: "PAID", escrowStatus: "HELD" },
      });
      if (marked.count === 0) {
        // The buyer cancelled while the M-Pesa prompt was still open: give the money back.
        await tx.order.update({ where: { id: order.id }, data: { escrowStatus: "REFUNDED", escrowSettledAt: new Date() } });
        await tx.walletEntry.create({
          data: { userId: order.buyerId, type: "REFUND", amountKes: order.totalKes, orderId: order.id, note: "Paid after the order was cancelled" },
        });
        continue;
      }
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
    return true;
  });

  if (settledPaid) {
    for (const order of payment.orders.filter((o) => o.status === "PENDING_PAYMENT")) {
      await notify(order.store.ownerId, {
        title: "New paid order",
        body: `New order paid: ${order.items.map((i) => `${i.quantity} x ${i.title}`).join(", ")}. Ship it to ${order.shippingTown}.`,
        link: `/dashboard/orders/${order.id}`,
        sms: true,
      });
    }
    await notify(payment.userId, {
      title: "Payment received",
      body: `M-Pesa payment of KSh ${payment.amountKes.toLocaleString("en-KE")} received and held safely until you confirm delivery.`,
      link: "/orders",
    });
  }

  return prisma.payment.findUnique({ where: { id: payment.id } });
}
