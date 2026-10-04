"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { normalizeKenyanPhone } from "@/lib/phone";
import { MIN_WITHDRAWAL_KES, WithdrawalError, requestWithdrawal } from "@/lib/wallet";
import type { FormState } from "./types";

const schema = z.object({
  amountKes: z.coerce.number().int("Whole shillings only").min(MIN_WITHDRAWAL_KES, `Minimum withdrawal is KSh ${MIN_WITHDRAWAL_KES}`),
  phone: z.string().trim(),
});

export async function withdraw(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/wallet");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const phone = normalizeKenyanPhone(parsed.data.phone);
  if (!phone) return { error: "Enter the M-Pesa number to send the money to" };
  try {
    await requestWithdrawal(user.id, parsed.data.amountKes, phone);
  } catch (error) {
    if (error instanceof WithdrawalError) return { error: error.message };
    throw error;
  }
  revalidatePath("/wallet");
  return { ok: "Withdrawal requested. You will receive it on M-Pesa once processed." };
}
