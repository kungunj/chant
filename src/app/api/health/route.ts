import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Uptime check: `ok` says whether the app can query the database, with the reason when it can't.
 * Always HTTP 200 so the reason is readable by tools that discard error bodies; monitors should
 * look for `"ok":true`.
 */
export async function GET(request: NextRequest) {
  // ?step=setup answers without touching Prisma: is the database configured and is the engine bundled?
  if (request.nextUrl.searchParams.get("step") === "setup") {
    const dir = path.join(process.cwd(), "node_modules/.prisma/client");
    return NextResponse.json(
      {
        node: process.version,
        platform: `${process.platform}-${process.arch}`,
        databaseConfigured: Boolean(process.env.DATABASE_URL),
        engines: existsSync(dir) ? readdirSync(dir).filter((f) => f.includes("engine")) : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
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
    // Drop quoted values (user names, hosts) so the reason is safe to show publicly.
    const reason = (error instanceof Error ? error.message : String(error))
      .replace(/`[^`]*`/g, "…")
      .replace(/postgres(?:ql)?:\/\/\S+/g, "…")
      .split("\n")
      .filter(Boolean)
      .slice(-2)
      .join(" ")
      .slice(0, 300);
    return NextResponse.json({ ok: false, code: code ?? null, reason }, { headers: { "Cache-Control": "no-store" } });
  }
}
