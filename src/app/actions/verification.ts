"use server";

import type { StoreDocumentKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStore } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MAX_DOCUMENT_BYTES, deletePrivateFile, savePrivateFile, sniffMimeType } from "@/lib/storage";
import type { FormState } from "./types";

const schema = z.object({
  legalName: z.string().trim().min(3, "Enter your full name as it appears on your ID").max(100),
  idType: z.enum(["NATIONAL_ID", "PASSPORT", "ALIEN_ID"]),
  idNumber: z.string().trim().regex(/^[A-Za-z0-9]{5,20}$/, "Enter a valid ID or passport number"),
  kraPin: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === "" || /^[AP]\d{9}[A-Z]$/.test(v), "KRA PIN looks like A123456789B")
    .optional(),
});

const fileFields: { field: string; kind: StoreDocumentKind; required: (idType: string) => boolean }[] = [
  { field: "idFront", kind: "ID_FRONT", required: () => true },
  { field: "idBack", kind: "ID_BACK", required: (idType) => idType !== "PASSPORT" },
  { field: "selfie", kind: "SELFIE", required: () => true },
  { field: "businessPermit", kind: "BUSINESS_PERMIT", required: () => false },
];

/** Seller submits identity documents; the store goes to the admin queue for approval. */
export async function submitVerification(_: FormState, formData: FormData): Promise<FormState> {
  const { store } = await requireStore();
  if (store.status !== "DRAFT" && store.status !== "REJECTED") return { error: "Your documents are already submitted" };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const uploads: { kind: StoreDocumentKind; name: string; bytes: Uint8Array; mimeType: string }[] = [];
  for (const { field, kind, required } of fileFields) {
    const file = formData.get(field);
    if (!(file instanceof File) || file.size === 0) {
      if (required(parsed.data.idType)) return { error: `Upload a photo of your ${kind === "SELFIE" ? "face holding your ID" : field === "idBack" ? "ID (back)" : "ID (front)"}` };
      continue;
    }
    if (file.size > MAX_DOCUMENT_BYTES) return { error: `${file.name} is larger than 5 MB` };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = sniffMimeType(bytes);
    if (!mimeType) return { error: `${file.name} must be a JPG, PNG, WebP or PDF` };
    uploads.push({ kind, name: file.name.slice(0, 120), bytes, mimeType });
  }

  const old = await prisma.storeDocument.findMany({ where: { storeId: store.id } });
  const saved = [];
  for (const u of uploads) {
    saved.push({ kind: u.kind, fileName: u.name, mimeType: u.mimeType, sizeBytes: u.bytes.length, storageKey: await savePrivateFile(u.bytes, u.mimeType) });
  }

  await prisma.$transaction([
    prisma.storeDocument.deleteMany({ where: { storeId: store.id } }),
    prisma.store.update({
      where: { id: store.id },
      data: {
        legalName: parsed.data.legalName,
        idType: parsed.data.idType,
        idNumber: parsed.data.idNumber.toUpperCase(),
        kraPin: parsed.data.kraPin || null,
        status: "PENDING_REVIEW",
        submittedAt: new Date(),
        reviewNote: null,
        documents: { create: saved },
      },
    }),
  ]);
  await Promise.all(old.map((d) => deletePrivateFile(d.storageKey)));

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
