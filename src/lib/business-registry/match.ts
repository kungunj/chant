import type { BusinessType } from "@prisma/client";

/** Upper-cases and removes spaces so "pvt- abc 1234" becomes "PVT-ABC1234". */
export function normalizeRegNo(value: string): string {
  return value.toUpperCase().replace(/\s+/g, "");
}

// Current BRS numbers (BN-, PVT-, LLP-) plus older formats still on certificates.
const REG_NO_PATTERNS: Record<BusinessType, RegExp[]> = {
  BUSINESS_NAME: [/^BN-[A-Z0-9]{6,10}$/, /^BN\/\d{4}\/\d{3,8}$/, /^\d{5,8}$/],
  PARTNERSHIP: [/^BN-[A-Z0-9]{6,10}$/, /^BN\/\d{4}\/\d{3,8}$/, /^\d{5,8}$/],
  LIMITED_COMPANY: [
    /^PVT-[A-Z0-9]{6,10}$/,
    /^(PVT|CPR)\/\d{4}\/\d{3,8}$/,
    /^C\.?\d{3,8}$/,
    /^PLC-[A-Z0-9]{6,10}$/,
  ],
  LLP: [/^LLP-[A-Z0-9]{5,10}$/],
};

export const regNoExamples: Record<BusinessType, string> = {
  BUSINESS_NAME: "BN-ABC1234",
  PARTNERSHIP: "BN-ABC1234",
  LIMITED_COMPANY: "PVT-ABC1234",
  LLP: "LLP-ABC123",
};

export function isValidRegNo(type: BusinessType, regNo: string): boolean {
  const value = normalizeRegNo(regNo);
  return REG_NO_PATTERNS[type].some((re) => re.test(value));
}

const SYNONYMS: [RegExp, string][] = [
  [/\bLIMITED\b/g, "LTD"],
  [/\bCOMPANY\b/g, "CO"],
  [/&/g, " AND "],
  [/\bENTERPRISES?\b/g, "ENT"],
  [/\bELECTRONICS?\b/g, "ELECTRONICS"],
];

/** Compares business names the way a person would: ignoring case, punctuation and "Limited" vs "Ltd". */
export function canonicalBusinessName(name: string): string {
  let n = ` ${name.toUpperCase()} `;
  for (const [re, to] of SYNONYMS) n = n.replace(re, to);
  return n.replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export function businessNamesMatch(a: string, b: string): boolean {
  return canonicalBusinessName(a) === canonicalBusinessName(b);
}

function nameTokens(name: string): Set<string> {
  return new Set(name.toUpperCase().replace(/[^A-Z ]/g, " ").split(/\s+/).filter((t) => t.length > 1));
}

/** How many names two people's full names have in common, ignoring case, order and punctuation. */
export function namesInCommon(a: string, b: string): number {
  const mine = nameTokens(a);
  return [...nameTokens(b)].filter((t) => mine.has(t)).length;
}

/** The seller (by the name on their ID) is one of the registered owners or directors: at least two names in common. */
export function personIsOwner(legalName: string, owners: string[]): boolean {
  return owners.some((owner) => namesInCommon(legalName, owner) >= 2);
}
