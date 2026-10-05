"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStore, requireTechnician, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatKes } from "@/lib/format";
import { notify } from "@/lib/notify";
import { rateLimit, TOO_MANY } from "@/lib/rate-limit";
import { normalizePartNumber } from "@/lib/search";
import { MAX_PHOTO_BYTES, deleteProductPhoto, saveProductPhoto, sniffMimeType } from "@/lib/storage";
import type { FormState } from "./types";

const MAX_PHOTOS = 8;

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
  postaFeeKes: z.string().trim(),
  fargoFeeKes: z.string().trim(),
});

/** Empty means the store does not ship with that courier. */
function parseFee(value: string): number | null | "invalid" {
  if (value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 50_000 ? n : "invalid";
}

export async function saveStore(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireTechnician();
  const parsed = storeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const postaFeeKes = parseFee(parsed.data.postaFeeKes);
  const fargoFeeKes = parseFee(parsed.data.fargoFeeKes);
  if (postaFeeKes === "invalid" || fargoFeeKes === "invalid") return { error: "Delivery fees must be whole shillings" };
  if (postaFeeKes === null && fargoFeeKes === null) return { error: "Offer at least one courier" };
  const data = {
    name: parsed.data.name,
    description: parsed.data.description,
    location: parsed.data.location,
    postaFeeKes,
    fargoFeeKes,
  };

  let store = user.store;
  if (store) {
    store = await prisma.store.update({ where: { id: store.id }, data });
  } else {
    let slug = slugify(parsed.data.name);
    if (await prisma.store.findUnique({ where: { slug } })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    store = await prisma.store.create({ data: { ...data, slug, ownerId: user.id } });
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
  if (!(await rateLimit(`product:${store.id}`, 60, 60 * 60 * 1000))) return { error: TOO_MANY };
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, imageUrls, ...fields } = parsed.data;

  const links = (imageUrls ?? "")
    .split(/\s+|,/)
    .map((u) => u.trim())
    .filter(Boolean);
  if (links.some((u) => !/^https:\/\//.test(u))) return { error: "Image links must start with https://" };

  const existing = id ? await prisma.product.findFirst({ where: { id, storeId: store.id, deletedAt: null } }) : null;
  if (id && !existing) return { error: "Listing not found" };
  const keep = new Set(formData.getAll("keepImage").map(String));
  const kept = (existing?.imageUrls ?? []).filter((u) => u.startsWith("/api/images/") && keep.has(u));

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (kept.length + files.length + links.length > MAX_PHOTOS) return { error: `A listing can have at most ${MAX_PHOTOS} photos` };
  const uploaded: string[] = [];
  for (const file of files) {
    if (file.size > MAX_PHOTO_BYTES) return { error: `${file.name} is larger than 5 MB` };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffMimeType(bytes);
    if (!type || type === "application/pdf") return { error: `${file.name} is not a JPG, PNG or WebP photo` };
    try {
      uploaded.push(await saveProductPhoto(bytes));
    } catch {
      return { error: `${file.name} could not be read as an image` };
    }
  }
  const urls = [...kept, ...uploaded, ...links];

  const data = {
    ...fields,
    partNumber: fields.partNumber || null,
    partNumberKey: fields.partNumber ? normalizePartNumber(fields.partNumber) : null,
    brand: fields.brand || null,
    modelName: fields.modelName || null,
    description: fields.description || null,
    imageUrls: urls,
  };

  if (id) {
    const updated = await prisma.product.updateMany({ where: { id, storeId: store.id, deletedAt: null }, data });
    if (updated.count === 0) return { error: "Listing not found" };
    const removed = (existing?.imageUrls ?? []).filter((u) => !urls.includes(u));
    await Promise.all(removed.map(deleteProductPhoto));
    if (existing && data.priceKes < existing.priceKes) await notifyPriceDrop(id, existing.priceKes, data.priceKes);
  } else {
    await prisma.product.create({ data: { ...data, storeId: store.id } });
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/** Tells everyone who saved the listing that it got cheaper. */
async function notifyPriceDrop(productId: string, oldPrice: number, newPrice: number) {
  const [product, savers] = await Promise.all([
    prisma.product.findUniqueOrThrow({ where: { id: productId } }),
    prisma.savedItem.findMany({ where: { productId }, select: { userId: true } }),
  ]);
  await Promise.all(
    savers.map(({ userId }) =>
      notify(userId, {
        title: "Price drop on a saved item",
        body: `${product.title} is now ${formatKes(newPrice)} (was ${formatKes(oldPrice)}).`,
        link: `/products/${productId}`,
      }),
    ),
  );
}

export async function deleteProduct(formData: FormData) {
  const { store } = await requireStore();
  const id = String(formData.get("productId") ?? "");
  // Soft delete: the listing disappears from the store and search, but past orders keep it.
  await prisma.product.updateMany({ where: { id, storeId: store.id }, data: { deletedAt: new Date() } });
  revalidatePath("/dashboard");
  revalidatePath(`/stores/${store.slug}`);
}
