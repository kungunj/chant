"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { readCart, writeCart } from "@/lib/cart";
import { prisma } from "@/lib/db";
import { deliveryFee } from "@/lib/delivery";
import { stkPush } from "@/lib/mpesa";
import { normalizeKenyanPhone } from "@/lib/phone";
import type { FormState } from "./types";

const checkoutSchema = z.object({
  shippingName: z.string().trim().min(2, "Enter the recipient's name"),
  shippingPhone: z.string().trim(),
  shippingAddress: z.string().trim().min(3, "Enter a delivery address or Posta box"),
  shippingTown: z.string().trim().min(2, "Enter the town"),
  courier: z.enum(["POSTA_KENYA", "FARGO_COURIER"]),
  mpesaPhone: z.string().trim(),
});

/** Sends the STK push for a payment and records Safaricom's request ids on it. */
async function sendStkPush(paymentId: string) {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  try {
    const result = await stkPush({
      phone: payment.phone,
      amount: payment.amountKes,
      accountReference: `SH${payment.id.slice(-8).toUpperCase()}`,
      description: "SparesHub order",
    });
    await prisma.payment.update({
      where: { id: paymentId },
      data: { merchantRequestId: result.merchantRequestId, checkoutRequestId: result.checkoutRequestId },
    });
  } catch (error) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "FAILED", resultDesc: error instanceof Error ? error.message : "Could not reach M-Pesa" },
    });
  }
}

export async function placeOrder(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/checkout");
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { mpesaPhone, ...shipping } = parsed.data;
  const phone = normalizeKenyanPhone(mpesaPhone);
  if (!phone) return { error: "Enter the M-Pesa number to pay with, e.g. 0712 345 678" };
  const shippingPhone = normalizeKenyanPhone(shipping.shippingPhone);
  if (!shippingPhone) return { error: "Enter a valid phone number for the recipient" };

  const cart = await readCart();
  const products = await prisma.product.findMany({
    where: { id: { in: Object.keys(cart) }, deletedAt: null, store: { status: "APPROVED" } },
    include: { store: true },
  });
  if (products.length === 0) return { error: "Your cart is empty" };
  for (const p of products) {
    if (p.store.ownerId === user.id) return { error: `You cannot buy "${p.title}" from your own store` };
    if (p.stock < cart[p.id]) return { error: `Only ${p.stock} of "${p.title}" left in stock` };
  }

  const byStore = new Map<string, typeof products>();
  for (const p of products) byStore.set(p.storeId, [...(byStore.get(p.storeId) ?? []), p]);
  const fees = new Map<string, number>();
  for (const [storeId, items] of byStore) {
    const fee = deliveryFee(items[0].store, shipping.courier);
    if (fee === null) return { error: `${items[0].store.name} does not ship with the courier you picked` };
    fees.set(storeId, fee);
  }
  const total =
    products.reduce((sum, p) => sum + p.priceKes * cart[p.id], 0) + [...fees.values()].reduce((a, b) => a + b, 0);

  const payment = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({ data: { userId: user.id, amountKes: total, phone } });
    for (const [storeId, items] of byStore) {
      await tx.order.create({
        data: {
          ...shipping,
          shippingPhone,
          buyerId: user.id,
          storeId,
          paymentId: payment.id,
          deliveryFeeKes: fees.get(storeId)!,
          totalKes: items.reduce((sum, p) => sum + p.priceKes * cart[p.id], 0) + fees.get(storeId)!,
          items: {
            create: items.map((p) => ({ productId: p.id, title: p.title, priceKes: p.priceKes, quantity: cart[p.id] })),
          },
        },
      });
    }
    return payment;
  });

  await writeCart({});
  await sendStkPush(payment.id);
  redirect(`/payments/${payment.id}`);
}

/** Starts a fresh STK push for orders whose earlier payment failed or was cancelled. */
export async function retryPayment(formData: FormData) {
  const user = await requireUser();
  const previous = await prisma.payment.findFirst({
    where: { id: String(formData.get("paymentId") ?? ""), userId: user.id, status: { in: ["FAILED", "CANCELLED"] } },
    include: { orders: { where: { status: "PENDING_PAYMENT" } } },
  });
  if (!previous || previous.orders.length === 0) redirect("/orders");

  const phone = normalizeKenyanPhone(String(formData.get("mpesaPhone") ?? "")) ?? previous.phone;
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      phone,
      amountKes: previous.orders.reduce((sum, o) => sum + o.totalKes, 0),
      orders: { connect: previous.orders.map((o) => ({ id: o.id })) },
    },
  });
  await sendStkPush(payment.id);
  redirect(`/payments/${payment.id}`);
}
