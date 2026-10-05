"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Saves a listing for later, or removes it if it is already saved. */
export async function toggleSaved(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const user = await requireUser(`/products/${productId}`);
  const existing = await prisma.savedItem.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
  if (existing) {
    await prisma.savedItem.delete({ where: { id: existing.id } });
  } else {
    const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null, store: { status: "APPROVED" } } });
    if (product) await prisma.savedItem.create({ data: { userId: user.id, productId } });
  }
  revalidatePath(`/products/${productId}`);
  revalidatePath("/saved");
}
