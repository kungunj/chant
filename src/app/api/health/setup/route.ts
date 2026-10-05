import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Deploy check that never touches Prisma: is the database configured and is the engine bundled? */
export function GET() {
  const dir = path.join(process.cwd(), "node_modules/.prisma/client");
  return NextResponse.json(
    {
      node: process.version,
      platform: `${process.platform}-${process.arch}`,
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      authSecretConfigured: Boolean(process.env.AUTH_SECRET),
      engines: existsSync(dir) ? readdirSync(dir).filter((f) => f.includes("engine")) : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
