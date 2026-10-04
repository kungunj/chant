"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessDispute } from "@/lib/disputes";
import { adminIds, notify } from "@/lib/notify";
import type { FormState } from "./types";

const openSchema = z.object({
  orderId: z.string(),
  reason: z.string().trim().min(10, "Describe the problem in a sentence or two").max(2000),
});

/** Buyer or seller freezes the escrow and brings in a moderator. */
export async function openDispute(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = openSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const order = await prisma.order.findFirst({
    where: {
      id: parsed.data.orderId,
      escrowStatus: "HELD",
      OR: [{ buyerId: user.id }, { store: { ownerId: user.id } }],
    },
    include: { dispute: true, store: true },
  });
  if (!order) return { error: "A dispute can only be opened while the payment is held in escrow" };
  if (order.dispute) redirect(`/disputes/${order.dispute.id}`);

  const dispute = await prisma.dispute.create({
    data: {
      orderId: order.id,
      openedById: user.id,
      reason: parsed.data.reason,
      messages: {
        create: [
          { body: `${user.name} opened a dispute. The payment stays in escrow until a SparesHub moderator resolves it.` },
          { authorId: user.id, body: parsed.data.reason },
        ],
      },
    },
  });
  const otherParty = order.buyerId === user.id ? order.store.ownerId : order.buyerId;
  await notify(otherParty, {
    title: "Dispute opened",
    body: `${user.name} opened a dispute on an order. The payment is frozen until a moderator resolves it. Please reply in the chat.`,
    link: `/disputes/${dispute.id}`,
    sms: true,
  });
  await notify(await adminIds(), { title: "New dispute", body: parsed.data.reason.slice(0, 140), link: `/disputes/${dispute.id}` });
  redirect(`/disputes/${dispute.id}`);
}

export async function postDisputeMessage(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const disputeId = String(formData.get("disputeId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a message" };
  if (body.length > 2000) return { error: "Keep messages under 2000 characters" };

  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId }, include: { order: { include: { store: true } } } });
  if (!dispute || !canAccessDispute(user, dispute)) return { error: "Dispute not found" };
  if (dispute.status !== "OPEN") return { error: "This dispute is closed" };

  await prisma.disputeMessage.create({ data: { disputeId, authorId: user.id, body } });
  const participants = [dispute.order.buyerId, dispute.order.store.ownerId].filter((id) => id !== user.id);
  await notify(participants, {
    title: user.role === "ADMIN" ? "Moderator message" : "New message in dispute",
    body: `${user.role === "ADMIN" ? "Moderator" : user.name}: ${body.slice(0, 140)}`,
    link: `/disputes/${disputeId}`,
  });
  revalidatePath(`/disputes/${disputeId}`);
  return undefined;
}
