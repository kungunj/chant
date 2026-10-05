"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notify";
import { MAX_MODERATORS } from "@/lib/roles";
import type { FormState } from "./types";

const emailSchema = z.string().trim().toLowerCase().email("Enter the email of an existing SparesHub account");

export async function addModerator(_: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const result = await prisma.$transaction(async (tx): Promise<{ error: string } | { ok: string; userId: string }> => {
    // Serialise moderator changes so two adds at once cannot pass the limit.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('spareshub-moderators'))`;
    const user = await tx.user.findUnique({
      where: { email: parsed.data },
      include: { store: { select: { id: true } } },
    });
    if (!user)
      return {
        error: "No account with that email. Ask them to sign up first.",
      };
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return { error: `${user.name} is already on the team` };
    if (user.store)
      return {
        error: "Sellers can't be moderators, because they would judge their own disputes",
      };
    const count = await tx.user.count({ where: { role: "ADMIN" } });
    if (count >= MAX_MODERATORS)
      return {
        error: `You already have ${MAX_MODERATORS} moderators. Remove one first.`,
      };
    await tx.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    return { ok: `${user.name} is now a moderator`, userId: user.id };
  });
  if ("ok" in result) {
    await notify(result.userId, {
      title: "You are a SparesHub moderator",
      body: "You can now review stores, moderate disputes and process withdrawals from the Admin page.",
      link: "/admin",
    });
  }
  revalidatePath("/admin/team");
  return "ok" in result ? { ok: result.ok } : { error: result.error };
}

export async function removeModerator(_: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "ADMIN") return { error: "That account is not a moderator" };
  await prisma.user.updateMany({
    where: { id: userId, role: "ADMIN" },
    data: { role: "BUYER" },
  });
  await notify(userId, {
    title: "Moderator access removed",
    body: "Your SparesHub moderator access has been removed. Your account still works for buying.",
  });
  revalidatePath("/admin/team");
  return { ok: `${user.name} is no longer a moderator` };
}
