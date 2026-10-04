"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { settleEscrow } from "@/lib/escrow";
import { notify } from "@/lib/notify";
import type { FormState } from "./types";

const reviewSchema = z.object({
  storeId: z.string(),
  decision: z.enum(["APPROVE", "REJECT", "SUSPEND"]),
  note: z.string().trim().max(500).optional(),
});

export async function reviewStore(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { storeId, decision, note } = parsed.data;
  if (decision !== "APPROVE" && !note) return { error: "Tell the seller why, so they can fix it" };

  const allowedFrom = { APPROVE: ["PENDING_REVIEW", "SUSPENDED"], REJECT: ["PENDING_REVIEW"], SUSPEND: ["APPROVED"] } as const;
  const updated = await prisma.store.updateMany({
    where: { id: storeId, status: { in: [...allowedFrom[decision]] } },
    data: {
      status: decision === "APPROVE" ? "APPROVED" : decision === "REJECT" ? "REJECTED" : "SUSPENDED",
      reviewedAt: new Date(),
      reviewedById: admin.id,
      reviewNote: note || null,
    },
  });
  if (updated.count === 0) return { error: "This store has already been reviewed" };
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  await notify(store.ownerId, {
    title: decision === "APPROVE" ? "Store approved" : decision === "REJECT" ? "Verification rejected" : "Store suspended",
    body:
      decision === "APPROVE"
        ? `${store.name} is verified and now visible to buyers.`
        : decision === "REJECT"
          ? `Your store verification was rejected: ${note}. You can submit again.`
          : `${store.name} has been suspended: ${note}`,
    link: decision === "REJECT" ? "/dashboard/verification" : "/dashboard",
    sms: true,
  });
  revalidatePath(`/admin/stores/${storeId}`);
  revalidatePath("/admin");
  return { ok: decision === "APPROVE" ? "Store approved and now public" : decision === "REJECT" ? "Application rejected" : "Store suspended" };
}

export async function markWithdrawalPaid(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("withdrawalId") ?? "");
  const reference = String(formData.get("reference") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{8,12}$/.test(reference)) return { error: "Enter the M-Pesa transaction code of the payout" };
  const updated = await prisma.withdrawal.updateMany({
    where: { id, status: "REQUESTED" },
    data: { status: "PAID", reference, processedAt: new Date() },
  });
  if (updated.count === 0) return { error: "Already processed" };
  const w = await prisma.withdrawal.findUniqueOrThrow({ where: { id } });
  await notify(w.userId, {
    title: "Withdrawal sent",
    body: `KSh ${w.amountKes.toLocaleString("en-KE")} sent to your M-Pesa, transaction ${reference}.`,
    link: "/wallet",
    sms: true,
  });
  revalidatePath("/admin/withdrawals");
  return { ok: "Marked as paid" };
}

export async function rejectWithdrawal(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("withdrawalId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return { error: "Give a reason" };
  const done = await prisma.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) return false;
    const claimed = await tx.withdrawal.updateMany({
      where: { id, status: "REQUESTED" },
      data: { status: "REJECTED", adminNote: note, processedAt: new Date() },
    });
    if (claimed.count === 0) return false;
    await tx.walletEntry.create({
      data: { userId: withdrawal.userId, type: "WITHDRAWAL_REVERSAL", amountKes: withdrawal.amountKes, withdrawalId: id, note },
    });
    return withdrawal;
  });
  if (!done) return { error: "Already processed" };
  await notify(done.userId, {
    title: "Withdrawal rejected",
    body: `Your withdrawal of KSh ${done.amountKes.toLocaleString("en-KE")} was rejected (${note}). The money is back in your wallet.`,
    link: "/wallet",
    sms: true,
  });
  revalidatePath("/admin/withdrawals");
  return { ok: "Rejected and money returned to the wallet" };
}

const resolveSchema = z.object({
  disputeId: z.string(),
  refundKes: z.coerce.number().int().min(0),
  resolution: z.string().trim().min(5, "Explain the decision to both parties").max(2000),
});

/** Moderator decides how the escrowed money is split, which also closes the dispute. */
export async function resolveDispute(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = resolveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { disputeId, refundKes, resolution } = parsed.data;

  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId }, include: { order: true } });
  if (!dispute || dispute.status !== "OPEN") return { error: "This dispute is already resolved" };
  if (refundKes > dispute.order.totalKes) return { error: "The refund cannot be more than the order total" };

  const ok = await prisma.$transaction(async (tx) => {
    const claimed = await tx.dispute.updateMany({
      where: { id: disputeId, status: "OPEN" },
      data: { status: "RESOLVED", refundKes, resolution, resolvedAt: new Date() },
    });
    if (claimed.count === 0) return false;
    if (!(await settleEscrow(tx, { orderId: dispute.orderId, refundKes, note: `Dispute resolved by moderator` }))) {
      throw new Error("Escrow already settled");
    }
    const seller = dispute.order.totalKes - refundKes;
    await tx.disputeMessage.create({
      data: {
        disputeId,
        authorId: admin.id,
        body: `Resolved: KSh ${refundKes.toLocaleString("en-KE")} refunded to the buyer, KSh ${seller.toLocaleString("en-KE")} released to the seller.\n\n${resolution}`,
      },
    });
    return true;
  });
  if (!ok) return { error: "This dispute is already resolved" };
  const order = await prisma.order.findUniqueOrThrow({ where: { id: dispute.orderId }, include: { store: true } });
  await notify([order.buyerId, order.store.ownerId], {
    title: "Dispute resolved",
    body: `The moderator resolved the dispute: KSh ${refundKes.toLocaleString("en-KE")} refunded to the buyer, KSh ${(order.totalKes - refundKes).toLocaleString("en-KE")} to the seller.`,
    link: `/disputes/${disputeId}`,
    sms: true,
  });
  revalidatePath(`/disputes/${disputeId}`);
  return { ok: "Dispute resolved" };
}
