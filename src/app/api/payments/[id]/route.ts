import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMpesaConfig, stkQuery } from "@/lib/mpesa";
import { settlePayment } from "@/lib/payments";

/** Seconds to wait for Safaricom's callback before asking Daraja directly. */
const QUERY_AFTER_SECONDS = 20;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;

  let payment = await prisma.payment.findFirst({ where: { id, userId: user.id } });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const config = getMpesaConfig();
  const age = (Date.now() - payment.createdAt.getTime()) / 1000;
  if (payment.status === "PENDING" && payment.checkoutRequestId && (config.mock ? age > 3 : age > QUERY_AFTER_SECONDS)) {
    try {
      const result = await stkQuery(payment.checkoutRequestId, config);
      if (result.state === "done") {
        payment =
          (await settlePayment({
            checkoutRequestId: payment.checkoutRequestId,
            resultCode: result.resultCode,
            resultDesc: result.resultDesc,
            receipt: config.mock && result.resultCode === 0 ? `MOCK${Date.now().toString(36).toUpperCase()}` : undefined,
          })) ?? payment;
      }
    } catch (error) {
      console.error("STK query failed", error);
    }
  }

  return NextResponse.json({ status: payment.status, resultDesc: payment.resultDesc, receipt: payment.mpesaReceipt });
}
