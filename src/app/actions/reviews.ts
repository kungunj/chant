"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notify";
import type { FormState } from "./types";

const schema = z.object({
  orderId: z.string(),
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  comment: z.string().trim().max(1000).optional(),
});

/** Buyer rates the seller once the order is finished (completed or settled by a moderator). */
export async function submitReview(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, buyerId: user.id, status: { in: ["DELIVERED", "REFUNDED"] } },
    include: { review: true, store: true },
  });
  if (!order) return { error: "You can review an order once it is completed" };
  if (order.review) return { error: "You already reviewed this order" };

  await prisma.review.create({
    data: {
      orderId: order.id,
      storeId: order.storeId,
      buyerId: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
    },
  });
  await notify(order.store.ownerId, {
    title: "New review",
    body: `${user.name} rated your store ${parsed.data.rating}/5.`,
    link: `/stores/${order.store.slug}`,
  });
  revalidatePath(`/orders/${order.id}`);
  revalidatePath(`/stores/${order.store.slug}`);
  return { ok: "Thanks for your review" };
}
