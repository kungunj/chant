"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStore, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelPaidOrder, releaseEscrow } from "@/lib/escrow";
import { courierLabels } from "@/lib/format";
import { notify } from "@/lib/notify";
import { recordShipmentEvent } from "@/lib/shipments";
import type { FormState } from "./types";

const shipSchema = z.object({
  orderId: z.string(),
  courier: z.enum(["POSTA_KENYA", "FARGO_COURIER", "OTHER"]),
  trackingNumber: z.string().trim().min(3, "Enter the courier's tracking / waybill number").max(60),
});

export async function shipOrder(_: FormState, formData: FormData): Promise<FormState> {
  const { store } = await requireStore();
  const parsed = shipSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { orderId, courier } = parsed.data;
  const trackingNumber = parsed.data.trackingNumber.toUpperCase();

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: store.id, status: "PAID" },
    include: { dispute: true },
  });
  if (!order) return { error: "Only paid orders can be shipped" };
  if (order.dispute?.status === "OPEN") return { error: "Resolve the open dispute before shipping" };

  await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { status: "SHIPPED", courier } }),
    prisma.shipment.create({
      data: {
        orderId: order.id,
        courier,
        trackingNumber,
        events: { create: { status: "AWAITING_PICKUP", source: "manual", note: "Handed to courier by seller" } },
      },
    }),
  ]);
  await notify(order.buyerId, {
    title: "Order shipped",
    body: `${store.name} shipped your order with ${courierLabels[courier]}, tracking number ${trackingNumber}.`,
    link: `/orders/${order.id}`,
    sms: true,
  });
  revalidatePath(`/dashboard/orders/${order.id}`);
  return { ok: "Marked as shipped" };
}

const updateSchema = z.object({
  shipmentId: z.string(),
  status: z.enum(["AWAITING_PICKUP", "IN_TRANSIT", "ARRIVED_AT_BRANCH", "OUT_FOR_DELIVERY", "DELIVERED", "RETURNED"]),
  location: z.string().trim().max(100).optional(),
  note: z.string().trim().max(300).optional(),
});

/** Seller posts a tracking update copied from the courier (used when there is no courier API). */
export async function addTrackingUpdate(_: FormState, formData: FormData): Promise<FormState> {
  const { store } = await requireStore();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const shipment = await prisma.shipment.findFirst({
    where: { id: parsed.data.shipmentId, order: { storeId: store.id, status: "SHIPPED" } },
  });
  if (!shipment) return { error: "Shipment not found" };
  await recordShipmentEvent({ ...parsed.data, source: "manual" });
  revalidatePath(`/dashboard/orders/${shipment.orderId}`);
  return { ok: "Update posted" };
}

/** Buyer confirms the parcel arrived, which releases the escrowed money to the seller. */
export async function confirmDelivery(formData: FormData) {
  const user = await requireUser();
  const order = await prisma.order.findFirst({
    where: { id: String(formData.get("orderId") ?? ""), buyerId: user.id, status: "SHIPPED", escrowStatus: "HELD" },
    include: { shipment: true, dispute: true },
  });
  if (!order?.shipment || order.dispute?.status === "OPEN") return;
  if (await releaseEscrow(order.id)) {
    await recordShipmentEvent({
      shipmentId: order.shipment.id,
      status: "DELIVERED",
      note: "Buyer confirmed receipt",
      source: "buyer",
    });
  }
  revalidatePath(`/orders/${order.id}`);
}

/** Buyer abandons an order that was never paid. */
export async function cancelUnpaidOrder(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("orderId") ?? "");
  await prisma.order.updateMany({
    where: { id, buyerId: user.id, status: "PENDING_PAYMENT" },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Cancelled by buyer before payment" },
  });
  revalidatePath(`/orders/${id}`);
}

const cancelSchema = z.object({
  orderId: z.string(),
  reason: z.string().trim().min(3, "Give a short reason").max(300),
});

/** Buyer or seller cancels a paid order before it ships; the buyer is refunded in full to their wallet. */
export async function cancelOrder(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = cancelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, OR: [{ buyerId: user.id }, { store: { ownerId: user.id } }] },
    include: { store: true, dispute: true },
  });
  if (!order || order.status !== "PAID") return { error: "Only paid orders that have not shipped can be cancelled" };
  if (order.dispute?.status === "OPEN") return { error: "This order has an open dispute; the moderator will decide" };

  const bySeller = order.store.ownerId === user.id;
  const reason = `${bySeller ? "Seller" : "Buyer"}: ${parsed.data.reason}`;
  if (!(await cancelPaidOrder(order.id, reason))) return { error: "This order can no longer be cancelled" };

  await notify(bySeller ? order.buyerId : order.store.ownerId, {
    title: "Order cancelled",
    body: bySeller
      ? `${order.store.name} cancelled your order (${parsed.data.reason}). KSh ${order.totalKes.toLocaleString("en-KE")} is back in your SparesHub wallet.`
      : `The buyer cancelled their order before shipping (${parsed.data.reason}).`,
    link: bySeller ? "/wallet" : `/dashboard/orders/${order.id}`,
    sms: true,
  });
  revalidatePath(bySeller ? `/dashboard/orders/${order.id}` : `/orders/${order.id}`);
  return { ok: "Order cancelled and the buyer refunded" };
}
