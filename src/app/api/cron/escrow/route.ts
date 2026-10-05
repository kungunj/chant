import { NextResponse, type NextRequest } from "next/server";
import { runAutoRelease } from "@/lib/escrow";
import { pruneRateLimits } from "@/lib/rate-limit";

/**
 * Releases escrow for parcels marked delivered more than ESCROW_AUTO_RELEASE_DAYS ago where the buyer
 * neither confirmed nor disputed. Call it from a scheduler (e.g. hourly) with
 * `Authorization: Bearer $CRON_SECRET`; Vercel Cron sends that header automatically.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runAutoRelease();
  await pruneRateLimits();
  return NextResponse.json(result);
}
