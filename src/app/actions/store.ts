"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStore, requireTechnician, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizePartNumber } from "@/lib/search";
import type { FormState } from "./types";

export async function becomeSeller() {
  const user = await requireUser("/dashboard/become-seller");
  if (user.role === "BUYER") await prisma.user.update({ where: { id: user.id }, data: { role: "TECHNICIAN" } });
  redirect("/dashboard/store");
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "store";
}

const storeSchema = z.object({
  name: z.string().trim().min(3, "Store name must be at least 3 characters").max(60),
  description: z.string().trim().max(1000).optional(),
  location: z.string().trim().max(100).optional(),
});

export async function saveStore(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireTechnician();
  const parsed = storeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let store = user.store;
  if (store) {
    store = await prisma.store.update({ where: { id: store.id }, data: parsed.data });
  } else {
    let slug = slugify(parsed.data.name);
    if (await prisma.store.findUnique({ where: { slug } })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    store = await prisma.store.create({ data: { ...parsed.data, slug, ownerId: user.id } });
  }
  revalidatePath("/dashboard");
  redirect(store.status === "DRAFT" || store.status === "REJECTED" ? "/dashboard/verification" : "/dashboard");
}

const productSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Give the item a title").max(120),
  partNumber: z.string().trim().max(60).optional(),
  brand: z.string().trim().max(60).optional(),
  modelName: z.string().trim().max(60).optional(),
  category: z.enum(["LAPTOP", "DESKTOP", "PHONE", "TV", "RADIO", "AUDIO", "CAR", "APPLIANCE", "OTHER"]),
  condition: z.enum(["NEW_SPARE", "USED_WORKING", "USED_FOR_PARTS", "REFURBISHED"]),
  description: z.string().trim().max(4000).optional(),
  priceKes: z.coerce.number().int("Price must be whole shillings").min(1, "Price must be at least KSh 1").max(10_000_000),
  stock: z.coerce.number().int().min(0).max(10_000),
  imageUrls: z.string().optional(),
});

export async function saveProduct(_: FormState, formData: FormData): Promise<FormState> {
  const { store } = await requireStore();
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, imageUrls, ...fields } = parsed.data;

  const urls = (imageUrls ?? "")
    .split(/\s+|,/)
    .map((u) => u.trim())
    .filter(Boolean);
  if (urls.some((u) => !/^https:\/\//.test(u))) return { error: "Image links must start with https://" };

  const data = {
    ...fields,
    partNumber: fields.partNumber || null,
    partNumberKey: fields.partNumber ? normalizePartNumber(fields.partNumber) : null,
    brand: fields.brand || null,
    modelName: fields.modelName || null,
    description: fields.description || null,
    imageUrls: urls.slice(0, 8),
  };

  if (id) {
    const updated = await prisma.product.updateMany({ where: { id, storeId: store.id, deletedAt: null }, data });
    if (updated.count === 0) return { error: "Listing not found" };
  } else {
    await prisma.product.create({ data: { ...data, storeId: store.id } });
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteProduct(formData: FormData) {
  const { store } = await requireStore();
  const id = String(formData.get("productId") ?? "");
  // Soft delete: the listing disappears from the store and search, but past orders keep it.
  await prisma.product.updateMany({ where: { id, storeId: store.id }, data: { deletedAt: new Date() } });
  revalidatePath("/dashboard");
  revalidatePath(`/stores/${store.slug}`);
}
