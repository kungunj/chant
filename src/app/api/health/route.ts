import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Uptime check: `ok` says whether the app can query the database, with the reason when it can't.
 * Always HTTP 200 so the reason is readable by tools that discard error bodies; monitors should
 * look for `"ok":true`. `/api/health/setup` checks configuration without touching the database.
 */
export async function GET() {
  try {
    // Imported here so a Prisma engine that fails to load is reported too, not just a failed query.
    const { prisma } = await import("@/lib/db");
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("No answer from the database within 8 seconds")), 8000),
    );
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = (error as { errorCode?: string; code?: string }).errorCode ?? (error as { code?: string }).code;
    // Mask passwords in connection strings so the reason is safe to show publicly.
    const reason = (error instanceof Error ? error.message : String(error))
      .replace(/(postgres(?:ql)?:\/\/[^:@\s]*:)[^@\s]*@/g, "$1***@")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ")
      .slice(0, 600);
    return NextResponse.json({ ok: false, code: code ?? null, reason }, { headers: { "Cache-Control": "no-store" } });
  }
}
