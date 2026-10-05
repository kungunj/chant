import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "./db";

/**
 * File storage. Identity documents are private (served only through /api/documents/[id] after an
 * access check); product photos are public (served from /api/images/[key]).
 *
 * Two backends, picked with STORAGE_DRIVER:
 * - "disk" (default): files under UPLOAD_DIR. Needs a persistent disk.
 * - "database": files in the StoredFile table. Works on serverless hosts (Netlify, Vercel) with no
 *   disk; fine for a test site or modest traffic. Move to object storage for heavy photo traffic.
 */
function storeInDatabase() {
  return process.env.STORAGE_DRIVER === "database";
}

function root() {
  return path.resolve(process.env.UPLOAD_DIR || "./uploads");
}

async function put(key: string, bytes: Uint8Array, mimeType: string, isPublic: boolean) {
  if (storeInDatabase()) {
    await prisma.storedFile.create({ data: { key, bytes: Buffer.from(bytes), mimeType } });
    return;
  }
  const dir = isPublic ? path.join(root(), "public") : root();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), bytes, isPublic ? undefined : { mode: 0o600 });
}

async function get(key: string, isPublic: boolean): Promise<Buffer> {
  if (storeInDatabase()) {
    const file = await prisma.storedFile.findUnique({ where: { key } });
    if (!file) throw new Error("File not found");
    return Buffer.from(file.bytes);
  }
  return readFile(path.join(isPublic ? path.join(root(), "public") : root(), key));
}

async function remove(key: string, isPublic: boolean) {
  if (storeInDatabase()) {
    await prisma.storedFile.deleteMany({ where: { key } });
    return;
  }
  await unlink(path.join(isPublic ? path.join(root(), "public") : root(), key)).catch(() => undefined);
}

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

const extensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

/** Works out the real file type from its first bytes rather than trusting the browser. */
export function sniffMimeType(bytes: Uint8Array): string | null {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf";
  if (starts(0x52, 0x49, 0x46, 0x46) && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

const privateKey = /^[0-9a-f-]{36}\.[a-z]+$/;

export async function savePrivateFile(bytes: Uint8Array, mimeType: string): Promise<string> {
  const key = `${randomUUID()}${extensions[mimeType] ?? ""}`;
  await put(key, bytes, mimeType, false);
  return key;
}

export async function readPrivateFile(key: string): Promise<Buffer> {
  if (!privateKey.test(key)) throw new Error("Bad storage key");
  return get(key, false);
}

export async function deletePrivateFile(key: string) {
  if (!privateKey.test(key)) return;
  await remove(key, false);
}

/** Product photos: resized to at most 1600px and re-encoded as WebP, which also strips EXIF/GPS data. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export async function saveProductPhoto(bytes: Uint8Array): Promise<string> {
  const sharp = (await import("sharp")).default;
  const webp = await sharp(bytes)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const key = `${randomUUID()}.webp`;
  await put(key, webp, "image/webp", true);
  return `/api/images/${key}`;
}

const photoKey = /^[0-9a-f-]{36}\.webp$/;

export async function readProductPhoto(key: string): Promise<Buffer> {
  if (!photoKey.test(key)) throw new Error("Bad image key");
  return get(key, true);
}

export async function deleteProductPhoto(url: string) {
  const key = url.startsWith("/api/images/") ? url.slice("/api/images/".length) : "";
  if (!photoKey.test(key)) return;
  await remove(key, true);
}
