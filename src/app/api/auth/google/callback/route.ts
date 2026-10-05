import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { decodeState, fetchGoogleProfile, GOOGLE_STATE_COOKIE } from "@/lib/google";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Google sends the person back here: log into the account with their Google email, or create one. */
export async function GET(request: NextRequest) {
  const fail = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));
    response.cookies.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });
    return response;
  };

  const saved = decodeState(request.cookies.get(GOOGLE_STATE_COOKIE)?.value);
  const code = request.nextUrl.searchParams.get("code");
  if (!saved || !code || request.nextUrl.searchParams.get("state") !== saved.state) return fail("google");
  if (!(await rateLimit(`google-ip:${await clientIp()}`, 30, 15 * 60 * 1000))) return fail("busy");

  const profile = await fetchGoogleProfile(code).catch(() => null);
  if (!profile) return fail("google");

  let user = await prisma.user.findUnique({ where: { email: profile.email } });
  const isNew = !user;
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        role: saved.seller ? "TECHNICIAN" : "BUYER",
        // An unguessable password: the account signs in with Google.
        passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
      },
    });
  }
  await createSession(user.id);

  const destination = isNew && saved.seller ? "/dashboard/store" : saved.next;
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });
  return response;
}
