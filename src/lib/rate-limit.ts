import { headers } from "next/headers";
import { prisma } from "./db";

/** The visitor's IP address as reported by the host's proxy (Netlify, Vercel, nginx). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-nf-client-connection-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * Records one attempt at `key` and says whether it is within `limit` attempts per `windowMs`.
 * Backed by Postgres so the limit holds across every server instance.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  const recent = await prisma.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });
  if (recent >= limit) return false;
  await prisma.rateLimitHit.create({ data: { key } });
  return true;
}

export async function clearRateLimit(key: string) {
  await prisma.rateLimitHit.deleteMany({ where: { key } });
}

/** Deletes hits older than a day; called from the hourly cron. */
export async function pruneRateLimits() {
  await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
}

export const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";
