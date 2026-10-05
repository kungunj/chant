import type { NameCheckStatus } from "@prisma/client";
import { namesInCommon } from "./business-registry/match";
import { prisma } from "./db";
import { getMpesaConfig, queryTransactionStatus, stkPush } from "./mpesa";
import { adminIds, notify } from "./notify";

/** Amount charged to learn the M-Pesa account name. */
export const NAME_CHECK_AMOUNT_KES = 1;

/** The rule: the M-Pesa account name and the names on the ID photo have at least two names in common. */
export function mpesaNameMatches(idNames: string, mpesaName: string): boolean {
  return namesInCommon(idNames, mpesaName) >= 2;
}

/** Sends the individual seller a KSh 1 M-Pesa prompt; when paid, Safaricom tells us the account name. */
export async function startNameCheck(storeId: string, userId: string, phone: string) {
  const push = await stkPush({ phone, amount: NAME_CHECK_AMOUNT_KES, accountReference: "NAMECHECK", description: "Name check" });
  const payment = await prisma.payment.create({
    data: {
      userId,
      phone,
      amountKes: NAME_CHECK_AMOUNT_KES,
      purpose: "NAME_CHECK",
      merchantRequestId: push.merchantRequestId,
      checkoutRequestId: push.checkoutRequestId,
    },
  });
  await prisma.store.update({
    where: { id: storeId },
    data: { mpesaPhone: phone, mpesaName: null, mpesaNameStatus: "PENDING", mpesaNameCheckedAt: null, nameCheckPaymentId: payment.id },
  });
  return payment;
}

function statusResultUrl() {
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const token = process.env.MPESA_CALLBACK_TOKEN ?? "";
  return `${appUrl}/api/mpesa/status-result${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

/** Called once the KSh 1 payment succeeds: asks Safaricom for the payer's name. */
export async function onNameCheckPaid(paymentId: string, receipt: string | null) {
  const store = await prisma.store.findUnique({ where: { nameCheckPaymentId: paymentId } });
  if (!store) return;
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
    await prisma.store.update({ where: { id: store.id }, data: { mpesaNameStatus: "ERROR", mpesaNameCheckedAt: new Date() } });
    console.error("M-Pesa name check failed", error);
  }
}

/** Compares the M-Pesa account name with the ID name and tells the moderators. */
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
  await notify(await adminIds(), {
    title: "Seller waiting for approval",
    body: `${store.name} (individual seller): ${
      status === "MATCHED"
        ? "M-Pesa name matches the ID photo."
        : status === "PENDING"
          ? "type the names on the ID photo to finish the M-Pesa name check."
          : "M-Pesa name does not match the ID photo."
    }`,
    link: `/admin/stores/${store.id}`,
  });
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
  await prisma.store.update({ where: { id: storeId }, data: { mpesaNameStatus: status, mpesaNameCheckedAt: new Date() } });
  return status;
}
