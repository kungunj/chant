import { prisma } from "./db";
import { readPrivateFile } from "./storage";

/**
 * Reads the holder's names off the ID photo the seller uploaded, so they can be compared with the
 * M-Pesa account name. Uses Dojah's document analysis (OCR) when DOJAH_APP_ID / DOJAH_SECRET_KEY are
 * set. Without a reader a moderator types the names they see on the photo.
 */

type TextField = { field_key?: string; field_name?: string; value?: string };

// Name fields on an ID, skipping the parents' names some documents carry.
const NAME_KEY = /(^|_)(surname|given_names?|first_name|middle_name|last_name|full_name|name)$/i;
const NOT_HOLDER = /father|mother|issuing|place|authority/i;

export function namesFromTextData(fields: TextField[]): string | null {
  const parts: string[] = [];
  for (const f of fields) {
    const key = f.field_key ?? f.field_name?.toLowerCase().replace(/\s+/g, "_") ?? "";
    if (!NAME_KEY.test(key) || NOT_HOLDER.test(key) || !f.value) continue;
    for (const word of f.value.toUpperCase().split(/[\s,]+/)) if (word && !parts.includes(word)) parts.push(word);
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

async function readWithDojah(image: Buffer, appId: string, secretKey: string, baseUrl: string): Promise<string | null> {
  const res = await fetch(new URL("/api/v1/document/analysis", baseUrl), {
    method: "POST",
    headers: { AppId: appId, Authorization: secretKey, "Content-Type": "application/json" },
    body: JSON.stringify({ input_type: "base64", imagefrontside: image.toString("base64") }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`ID reader failed (Dojah HTTP ${res.status})`);
  const body = (await res.json()) as { entity?: { text_data?: TextField[] } };
  return namesFromTextData(body.entity?.text_data ?? []);
}

/** Reads the names on the store's ID front photo and saves them on the store. Never throws. */
export async function readIdNames(storeId: string): Promise<string | null> {
  const store = await prisma.store.findUniqueOrThrow({
    where: { id: storeId },
    include: { documents: { where: { kind: "ID_FRONT" } } },
  });
  const front = store.documents[0];
  if (!front || !front.mimeType.startsWith("image/")) return null;

  const { DOJAH_APP_ID, DOJAH_SECRET_KEY, DOJAH_BASE_URL } = process.env;
  let names: string | null = null;
  let source: string | null = null;
  try {
    if (DOJAH_APP_ID && DOJAH_SECRET_KEY) {
      names = await readWithDojah(await readPrivateFile(front.storageKey), DOJAH_APP_ID, DOJAH_SECRET_KEY, DOJAH_BASE_URL || "https://api.dojah.io");
      source = "dojah";
    } else if (process.env.MPESA_MOCK === "true") {
      // Demo mode: pretend the photo shows the name the seller typed.
      names = (store.legalName ?? "").toUpperCase() || null;
      source = "mock";
    }
  } catch (error) {
    console.error("Reading ID photo failed", error);
  }
  if (names) await prisma.store.update({ where: { id: storeId }, data: { idNamesRead: names, idNamesSource: source } });
  return names;
}
