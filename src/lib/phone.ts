/**
 * Normalises a Kenyan mobile number to the 2547XXXXXXXX / 2541XXXXXXXX form Daraja expects.
 * Accepts 07.., 01.., 7.., 1.., +254.., 254.. with optional spaces or dashes.
 * Returns null when the number is not a valid Kenyan mobile number.
 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, "").replace(/^\+/, "");
  let local: string;
  if (/^254[17]\d{8}$/.test(digits)) local = digits.slice(3);
  else if (/^0[17]\d{8}$/.test(digits)) local = digits.slice(1);
  else if (/^[17]\d{8}$/.test(digits)) local = digits;
  else return null;
  return `254${local}`;
}
