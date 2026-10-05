import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Uptime check: 200 when the app can query the database, 503 with the reason when it can't. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = (error as { errorCode?: string; code?: string }).errorCode ?? (error as { code?: string }).code;
    // Drop quoted values (user names, hosts) so the reason is safe to show publicly.
    const reason = (error instanceof Error ? error.message : String(error))
      .replace(/`[^`]*`/g, "…")
      .replace(/postgres(?:ql)?:\/\/\S+/g, "…")
      .split("\n")
      .filter(Boolean)
      .slice(-2)
      .join(" ")
      .slice(0, 300);
    return NextResponse.json(
      { ok: false, code: code ?? null, reason },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
