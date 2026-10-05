"use server";

import { Prisma, type StoreDocumentKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStore } from "@/lib/auth";
import { checkStoreRegistration } from "@/lib/business-registry";
import { isValidRegNo, normalizeRegNo, regNoExamples } from "@/lib/business-registry/match";
import { prisma } from "@/lib/db";
import { adminIds, notify } from "@/lib/notify";
import { readIdNames } from "@/lib/id-reader";
import { startNameCheck } from "@/lib/name-check";
import { normalizeKenyanPhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_DOCUMENT_BYTES, deletePrivateFile, savePrivateFile, sniffMimeType } from "@/lib/storage";
import type { FormState } from "./types";

const kraPin = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => v === "" || /^[AP]\d{9}[A-Z]$/.test(v), "The KRA PIN looks like A123456789B or P051234567X");

const identity = {
  legalName: z.string().trim().min(3, "Enter your full name as it appears on your ID").max(100),
  idType: z.enum(["NATIONAL_ID", "PASSPORT", "ALIEN_ID"]),
  idNumber: z.string().trim().regex(/^[A-Za-z0-9]{5,20}$/, "Enter a valid ID or passport number"),
};

const schema = z.discriminatedUnion("sellerType", [
  z.object({
    sellerType: z.literal("BUSINESS"),
    ...identity,
    kraPin: kraPin.refine((v) => v !== "", "Enter the business's KRA PIN"),
    businessType: z.enum(["BUSINESS_NAME", "PARTNERSHIP", "LIMITED_COMPANY", "LLP"], {
      message: "Choose how your business is registered",
    }),
    businessName: z.string().trim().min(3, "Enter the business name exactly as registered").max(150),
    businessRegNo: z.string().trim().transform(normalizeRegNo),
  }),
  z.object({
    sellerType: z.literal("INDIVIDUAL"),
    ...identity,
    kraPin: kraPin.optional(),
    mpesaPhone: z.string().trim(),
  }),
]);

type Entered = z.infer<typeof schema>;
const isBusiness = (d: Entered) => d.sellerType === "BUSINESS";
const fileFields: { field: string; kind: StoreDocumentKind; label: string; required: (d: Entered) => boolean }[] = [
  { field: "idFront", kind: "ID_FRONT", label: "your ID (front)", required: () => true },
  { field: "idBack", kind: "ID_BACK", label: "your ID (back)", required: (d) => d.idType !== "PASSPORT" },
  { field: "selfie", kind: "SELFIE", label: "your face holding your ID", required: () => true },
  { field: "certificate", kind: "REGISTRATION_CERTIFICATE", label: "the registration certificate", required: isBusiness },
  {
    field: "cr12",
    kind: "CR12",
    label: "the company's CR12",
    required: (d) => d.sellerType === "BUSINESS" && d.businessType === "LIMITED_COMPANY",
  },
  { field: "businessPermit", kind: "BUSINESS_PERMIT", label: "the business permit", required: () => false },
];

/** Seller submits identity documents; the store goes to the admin queue for approval. */
export async function submitVerification(_: FormState, formData: FormData): Promise<FormState> {
  const { user, store } = await requireStore();
  if (store.status !== "DRAFT" && store.status !== "REJECTED") return { error: "Your documents are already submitted" };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;
  if (data.sellerType === "BUSINESS" && !isValidRegNo(data.businessType, data.businessRegNo)) {
    return { error: `Enter the registration number from your certificate, e.g. ${regNoExamples[data.businessType]}` };
  }
  const mpesaPhone = data.sellerType === "INDIVIDUAL" ? normalizeKenyanPhone(data.mpesaPhone) : null;
  if (data.sellerType === "INDIVIDUAL" && !mpesaPhone) {
    return { error: "Enter the M-Pesa number registered in your name, e.g. 0712 345 678" };
  }

  const uploads: { kind: StoreDocumentKind; name: string; bytes: Uint8Array; mimeType: string }[] = [];
  for (const { field, kind, label, required } of fileFields) {
    const file = formData.get(field);
    if (!(file instanceof File) || file.size === 0) {
      if (required(data)) return { error: `Upload a photo or PDF of ${label}` };
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
        sellerType: data.sellerType,
        legalName: data.legalName,
        idType: data.idType,
        idNumber: data.idNumber.toUpperCase(),
        kraPin: data.kraPin || null,
        businessType: data.sellerType === "BUSINESS" ? data.businessType : null,
        businessName: data.sellerType === "BUSINESS" ? data.businessName : null,
        businessRegNo: data.sellerType === "BUSINESS" ? data.businessRegNo : null,
        idNamesRead: null,
        idNamesSource: null,
        mpesaPhone,
        mpesaName: null,
        mpesaNameStatus: "NOT_CHECKED",
        mpesaNameCheckedAt: null,
        registryStatus: "NOT_CHECKED",
        registryCheckedAt: null,
        registrySource: null,
        registryDetails: Prisma.DbNull,
        status: "PENDING_REVIEW",
        submittedAt: new Date(),
        reviewNote: null,
        documents: { create: saved },
      },
    }),
  ]);
  await Promise.all(old.map((d) => deletePrivateFile(d.storageKey)));
  revalidatePath("/dashboard");
  await readIdNames(store.id);

  if (data.sellerType === "INDIVIDUAL" && mpesaPhone) {
    // KSh 1 M-Pesa prompt: once paid, Safaricom tells us the account name to compare with the ID.
    const payment = await startNameCheck(store.id, user.id, mpesaPhone);
    redirect(`/payments/${payment.id}`);
  }

  // Check the business with the Registrar now, so the moderator sees the result straight away.
  await checkStoreRegistration(store.id);
  await notify(await adminIds(), {
    title: "Store waiting for approval",
    body: `${store.name} submitted identity and business documents for review.`,
    link: `/admin/stores/${store.id}`,
  });
  redirect("/dashboard");
}

/** Sends the KSh 1 name-check prompt again (cancelled, failed, or a different number). */
export async function retryNameCheck(formData: FormData) {
  const { user, store } = await requireStore();
  if (store.sellerType !== "INDIVIDUAL" || store.status !== "PENDING_REVIEW") redirect("/dashboard");
  const phone = normalizeKenyanPhone(String(formData.get("mpesaPhone") ?? "")) ?? store.mpesaPhone;
  if (!phone || !(await rateLimit(`stk:${user.id}`, 6, 10 * 60 * 1000))) redirect("/dashboard");
  const payment = await startNameCheck(store.id, user.id, phone);
  redirect(`/payments/${payment.id}`);
}
