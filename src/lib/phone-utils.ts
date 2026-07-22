/** Normalize Indian phone numbers for Shopify Admin API (E.164 +91). */
export function normalizeShopifyPhone(phone: string | undefined): string {
  let digits = (phone ?? "").replace(/\D/g, "");

  // 06200104450 → 6200104450 (leading 0 on 11-digit Indian numbers)
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // 916200104450 → 6200104450
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 10) return `+91${digits.slice(-10)}`;

  const fallback = process.env.VITE_STORE_PHONE?.replace(/\D/g, "") ?? "9876543210";
  return `+91${fallback.slice(-10)}`;
}

export function isValidIndianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "");
  const normalized = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(normalized.slice(-10));
}
