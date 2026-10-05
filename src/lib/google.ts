import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * "Sign in with Google" using the OAuth authorization-code flow. Google returns the person's email and
 * name in a signed ID token; SparesHub logs into the account with that email or creates one.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

type Env = Record<string, string | undefined>;

export const GOOGLE_STATE_COOKIE = "spareshub_google";

export function googleConfigured(env: Env = process.env) {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri(env: Env = process.env) {
  return `${(env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/auth/google/callback`;
}

export function googleAuthUrl(state: string, env: Env = process.env) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: googleRedirectUri(env),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params}`;
}

/** What the sign-in started with, kept in a short-lived cookie until Google sends the person back. */
export type GoogleState = { state: string; next: string; seller: boolean };

export function encodeState(value: GoogleState) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodeState(raw: string | undefined): GoogleState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString());
    if (typeof value.state !== "string" || typeof value.next !== "string") return null;
    return { state: value.state, next: value.next, seller: value.seller === true };
  } catch {
    return null;
  }
}

/** Only same-site paths, so a crafted link can't send people elsewhere after signing in. */
export function safeNextPath(next: string | null | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export type GoogleProfile = { email: string; name: string };

/** Swaps the code for tokens and returns the verified email and name, or null if Google didn't confirm them. */
export async function fetchGoogleProfile(code: string, env: Env = process.env): Promise<GoogleProfile | null> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID ?? "",
      client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: googleRedirectUri(env),
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) return null;
  const { id_token: idToken } = (await response.json()) as { id_token?: string };
  if (!idToken) return null;
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: env.GOOGLE_CLIENT_ID,
  });
  return profileFromClaims(payload);
}

export function profileFromClaims(claims: Record<string, unknown>): GoogleProfile | null {
  if (claims.email_verified !== true || typeof claims.email !== "string") return null;
  const email = claims.email.trim().toLowerCase();
  const name = typeof claims.name === "string" && claims.name.trim() ? claims.name.trim() : email.split("@")[0];
  return { email, name };
}
