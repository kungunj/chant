"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStore, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { releaseEscrow } from "@/lib/escrow";
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
  const { orderId, courier, trackingNumber } = parsed.data;

  const order = await prisma.order.findFirst({ where: { id: orderId, storeId: store.id, status: "PAID" } });
  if (!order) return { error: "Only paid orders can be shipped" };

  await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { status: "SHIPPED", courier } }),
    prisma.shipment.create({
      data: {
        orderId: order.id,
        courier,
        trackingNumber: trackingNumber.toUpperCase(),
        events: { create: { status: "AWAITING_PICKUP", source: "manual", note: "Handed to courier by seller" } },
      },
    }),
  ]);
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
    where: { id: parsed.data.shipmentId, order: { storeId: store.id } },
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
