import { NextResponse, type NextRequest } from "next/server";
import { encodeState, GOOGLE_STATE_COOKIE, googleAuthUrl, googleConfigured, safeNextPath } from "@/lib/google";

export const dynamic = "force-dynamic";

/** Starts "Sign in with Google": remembers where to go afterwards, then sends the person to Google. */
export function GET(request: NextRequest) {
  if (!googleConfigured()) return NextResponse.redirect(new URL("/login?error=google-off", request.url));
  const state = crypto.randomUUID();
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const seller = request.nextUrl.searchParams.get("seller") === "1";
  const response = NextResponse.redirect(googleAuthUrl(state));
  response.cookies.set(GOOGLE_STATE_COOKIE, encodeState({ state, next, seller }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 10 * 60,
  });
  return response;
}
