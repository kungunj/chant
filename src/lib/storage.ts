import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * File storage. Identity documents are private; product photos are public.
 *
 * Private file storage for identity documents. Files live outside `public/` and are only served
 * through /api/documents/[id] after an access check. This uses the local disk (UPLOAD_DIR); on a
 * host without a persistent disk swap these three functions for a private S3/R2/Supabase bucket.
 */
function root() {
  return path.resolve(process.env.UPLOAD_DIR || "./uploads");
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

export async function savePrivateFile(bytes: Uint8Array, mimeType: string): Promise<string> {
  const key = `${randomUUID()}${extensions[mimeType] ?? ""}`;
  await mkdir(root(), { recursive: true });
  await writeFile(path.join(root(), key), bytes, { mode: 0o600 });
  return key;
}

export async function readPrivateFile(key: string): Promise<Buffer> {
  if (!/^[0-9a-f-]{36}\.[a-z]+$/.test(key)) throw new Error("Bad storage key");
  return readFile(path.join(root(), key));
}

export async function deletePrivateFile(key: string) {
  if (!/^[0-9a-f-]{36}\.[a-z]+$/.test(key)) return;
  await unlink(path.join(root(), key)).catch(() => undefined);
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
  await mkdir(path.join(root(), "public"), { recursive: true });
  await writeFile(path.join(root(), "public", key), webp);
  return `/api/images/${key}`;
}

const photoKey = /^[0-9a-f-]{36}\.webp$/;

export async function readProductPhoto(key: string): Promise<Buffer> {
  if (!photoKey.test(key)) throw new Error("Bad image key");
  return readFile(path.join(root(), "public", key));
}

export async function deleteProductPhoto(url: string) {
  const key = url.startsWith("/api/images/") ? url.slice("/api/images/".length) : "";
  if (!photoKey.test(key)) return;
  await unlink(path.join(root(), "public", key)).catch(() => undefined);
}
