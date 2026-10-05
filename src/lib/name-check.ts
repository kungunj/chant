import type { NameCheckStatus } from "@prisma/client";
import { namesInCommon } from "./business-registry/match";
import { prisma } from "./db";
import { getMpesaConfig, queryTransactionStatus, stkPush } from "./mpesa";
import { registryStatusLabels } from "./format";
import { adminIds, notify } from "./notify";

/** What a seller pays to register, by M-Pesa (SELLER_REGISTRATION_FEE_KES, default KSh 100). */
export function registrationFeeKes(env: Record<string, string | undefined> = process.env) {
  const fee = Number(env.SELLER_REGISTRATION_FEE_KES ?? 100);
  return Number.isInteger(fee) && fee >= 1 ? fee : 100;
}

/** Once the fee is paid, checking a different M-Pesa line only costs KSh 1. */
export const NAME_RECHECK_KES = 1;

/** The rule: the M-Pesa account name and the names on the ID photo have at least two names in common. */
export function mpesaNameMatches(idNames: string, mpesaName: string): boolean {
  return namesInCommon(idNames, mpesaName) >= 2;
}

/**
 * Sends the seller the registration fee prompt (or a KSh 1 prompt to check another line once the fee
 * is paid). For individual sellers Safaricom then tells us the M-Pesa account name.
 */
export async function startNameCheck(storeId: string, userId: string, phone: string) {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const amount = store.registrationFeePaidAt ? NAME_RECHECK_KES : registrationFeeKes();
  const push = await stkPush({
    phone,
    amount,
    accountReference: "SELLERREG",
    description: store.registrationFeePaidAt ? "Name check" : "Seller registration",
  });
  const payment = await prisma.payment.create({
    data: {
      userId,
      phone,
      amountKes: amount,
      purpose: "NAME_CHECK",
      merchantRequestId: push.merchantRequestId,
      checkoutRequestId: push.checkoutRequestId,
    },
  });
  const individual = store.sellerType === "INDIVIDUAL";
  await prisma.store.update({
    where: { id: storeId },
    data: {
      nameCheckPaymentId: payment.id,
      ...(individual
        ? { mpesaPhone: phone, mpesaName: null, mpesaNameStatus: "PENDING", mpesaNameCheckedAt: null }
        : {}),
    },
  });
  return payment;
}

/**
 * Approves a store with no moderator when the automatic checks pass: the fee is paid and the
 * Registrar's record (businesses) or the M-Pesa name (individuals) matches. Anything else waits
 * for a moderator. Returns true if this call approved the store.
 */
export async function autoApproveIfVerified(storeId: string): Promise<boolean> {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  if (store.status !== "PENDING_REVIEW" || !store.registrationFeePaidAt) return false;
  const matched =
    store.sellerType === "BUSINESS" ? store.registryStatus === "MATCHED" : store.mpesaNameStatus === "MATCHED";
  if (!matched) return false;
  const reason =
    store.sellerType === "BUSINESS"
      ? "Approved automatically: business details match the Registrar."
      : "Approved automatically: M-Pesa name matches the ID.";
  const updated = await prisma.store.updateMany({
    where: { id: storeId, status: "PENDING_REVIEW" },
    data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: null, reviewNote: reason },
  });
  if (updated.count === 0) return false;
  await notify(store.ownerId, {
    title: "Store approved",
    body: `${store.name} is verified and now visible to buyers.`,
    link: "/dashboard",
    sms: true,
  });
  await notify(await adminIds(), {
    title: "Store approved automatically",
    body: `${store.name}: ${reason.replace("Approved automatically: ", "")} You can still suspend it.`,
    link: `/admin/stores/${store.id}`,
  });
  return true;
}

/** Tells the moderators a store needs them (a check did not match, or could not run). */
async function askModerators(storeId: string, problem: string) {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  await notify(await adminIds(), {
    title: "Seller waiting for approval",
    body: `${store.name}: ${problem}`,
    link: `/admin/stores/${store.id}`,
  });
}

function statusResultUrl() {
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const token = process.env.MPESA_CALLBACK_TOKEN ?? "";
  return `${appUrl}/api/mpesa/status-result${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

/** A business that has paid the fee: approve it if the Registrar matched, otherwise ask the moderators. */
export async function finishBusinessCheck(storeId: string) {
  if (await autoApproveIfVerified(storeId)) return;
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  await askModerators(
    storeId,
    `registration fee paid. ${registryStatusLabels[store.registryStatus]}.`,
  );
}

/** Called once the seller's payment succeeds: records the fee and, for individuals, asks Safaricom for the payer's name. */
export async function onNameCheckPaid(paymentId: string, receipt: string | null) {
  let store = await prisma.store.findUnique({ where: { nameCheckPaymentId: paymentId } });
  if (!store) return;
  if (!store.registrationFeePaidAt) {
    store = await prisma.store.update({ where: { id: store.id }, data: { registrationFeePaidAt: new Date() } });
  }
  if (store.sellerType === "BUSINESS") return finishBusinessCheck(store.id);
  if (getMpesaConfig().mock) {
    // No Safaricom in mock mode: pretend the line is registered to the name on the ID,
    // unless the ID name contains "Mismatch" (for testing the other path).
    const name = /mismatch/i.test(store.legalName ?? "") ? "SOMEONE ELSE" : (store.legalName ?? "").toUpperCase();
    // (In mock mode the ID reader also returns the typed name, so this matches unless testing a mismatch.)
    await recordMpesaName(store.id, name);
    return;
  }
  if (!receipt) return; // The STK callback brings the receipt; the check continues when it arrives.
  try {
    await queryTransactionStatus({ receipt, resultUrl: statusResultUrl() });
  } catch (error) {
    await prisma.store.update({
      where: { id: store.id },
      data: { mpesaNameStatus: "ERROR", mpesaNameCheckedAt: new Date() },
    });
    console.error("M-Pesa name check failed", error);
  }
}

/** Compares the M-Pesa account name with the ID name; approves the store on a match, otherwise asks the moderators. */
export async function recordMpesaName(storeId: string, mpesaName: string | undefined): Promise<NameCheckStatus> {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const idNames = store.idNamesRead;
  // Until the names on the ID photo are known (read automatically or typed by a moderator), keep waiting.
  const status: NameCheckStatus = !mpesaName
    ? "ERROR"
    : !idNames
      ? "PENDING"
      : mpesaNameMatches(idNames, mpesaName)
        ? "MATCHED"
        : "MISMATCH";
  await prisma.store.update({
    where: { id: storeId },
    data: { mpesaName: mpesaName ?? null, mpesaNameStatus: status, mpesaNameCheckedAt: new Date() },
  });
  if (!(await autoApproveIfVerified(storeId))) {
    await askModerators(
      storeId,
      status === "PENDING"
        ? "type the names on the ID photo to finish the M-Pesa name check."
        : status === "MATCHED"
          ? "M-Pesa name matches the ID photo."
          : "M-Pesa name does not match the ID photo.",
    );
  }
  return status;
}

/** A moderator types the names they read on the ID photo; the M-Pesa comparison then runs again. */
export async function setIdNamesByModerator(storeId: string, names: string): Promise<NameCheckStatus | null> {
  const store = await prisma.store.update({
    where: { id: storeId },
    data: { idNamesRead: names.toUpperCase(), idNamesSource: "moderator" },
  });
  if (!store.mpesaName) return null;
  const status: NameCheckStatus = mpesaNameMatches(names, store.mpesaName) ? "MATCHED" : "MISMATCH";
  await prisma.store.update({
    where: { id: storeId },
    data: { mpesaNameStatus: status, mpesaNameCheckedAt: new Date() },
  });
  await autoApproveIfVerified(storeId);
  return status;
}
