import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readPrivateFile } from "@/lib/storage";

/** Serves a seller's ID document to that seller or an admin, never publicly. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Not signed in", { status: 401 });
  const { id } = await params;
  const doc = await prisma.storeDocument.findUnique({ where: { id }, include: { store: true } });
  if (!doc || (user.role !== "ADMIN" && doc.store.ownerId !== user.id)) return new NextResponse("Not found", { status: 404 });

  const bytes = await readPrivateFile(doc.storageKey);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
