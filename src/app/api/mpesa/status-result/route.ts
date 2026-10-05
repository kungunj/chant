import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { parseTransactionStatusResult } from "@/lib/mpesa";
import { recordMpesaName } from "@/lib/name-check";

/** Safaricom POSTs the Transaction Status answer here (the payer's name for a seller name check). */
export async function POST(request: NextRequest) {
  const expected = process.env.MPESA_CALLBACK_TOKEN;
  if (expected && request.nextUrl.searchParams.get("token") !== expected) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Rejected" }, { status: 401 });
  }
  const result = parseTransactionStatusResult(await request.json().catch(() => null));
  if (!result?.receipt) return NextResponse.json({ ResultCode: 1, ResultDesc: "Malformed result" }, { status: 400 });

  const store = await prisma.store.findFirst({ where: { nameCheckPayment: { mpesaReceipt: result.receipt } } });
  if (store && store.mpesaNameStatus === "PENDING") {
    await recordMpesaName(store.id, result.resultCode === 0 ? result.payerName : undefined);
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
