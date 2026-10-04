import { NextResponse, type NextRequest } from "next/server";
import { parseStkCallback } from "@/lib/mpesa";
import { settlePayment } from "@/lib/payments";

/**
 * Safaricom POSTs the STK Push result here. The URL carries a shared token (MPESA_CALLBACK_TOKEN)
 * so forged requests are rejected; in production also restrict this route to Safaricom's IPs.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.MPESA_CALLBACK_TOKEN;
  if (expected && request.nextUrl.searchParams.get("token") !== expected) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Rejected" }, { status: 401 });
  }

  const callback = parseStkCallback(await request.json().catch(() => null));
  if (!callback) return NextResponse.json({ ResultCode: 1, ResultDesc: "Malformed callback" }, { status: 400 });

  await settlePayment({
    checkoutRequestId: callback.checkoutRequestId,
    resultCode: callback.resultCode,
    resultDesc: callback.resultDesc,
    receipt: callback.receipt,
    amount: callback.amount,
  });
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
