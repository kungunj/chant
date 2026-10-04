"use server";

import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { sendSms } from "@/lib/sms";
import type { FormState } from "./types";

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/**
 * Step 1: send a 6-digit code to the phone on the account. The response is the same whether or not
 * the account exists, so the form cannot be used to discover who is registered.
 */
export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.phone) {
    const recent = await prisma.passwordReset.count({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent < 3) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      await prisma.passwordReset.create({
        data: { userId: user.id, codeHash: await bcrypt.hash(code, 10), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
      });
      await sendSms(user.phone, `Your SparesHub password reset code is ${code}. It expires in 15 minutes.`);
    }
  }
  redirect(`/reset-password?email=${encodeURIComponent(email)}`);
}

const resetSchema = z.object({
  email: z.string().trim().toLowerCase(),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the SMS"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/** Step 2: check the code and set the new password. */
export async function resetPassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, code, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const reset = user
    ? await prisma.passwordReset.findFirst({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: MAX_ATTEMPTS } },
        orderBy: { createdAt: "desc" },
      })
    : null;
  if (!user || !reset) return { error: "That code is wrong or has expired. Request a new one." };

  if (!(await bcrypt.compare(code, reset.codeHash))) {
    await prisma.passwordReset.update({ where: { id: reset.id }, data: { attempts: { increment: 1 } } });
    return { error: "That code is wrong or has expired. Request a new one." };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 10) } }),
    prisma.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
  await createSession(user.id);
  redirect("/");
}
