/** Public business details — configure via VITE_STORE_* in .env (no fake placeholders shown). */

function env(key: string): string {
  return String((import.meta.env[key] as string | undefined) ?? "").trim();
}

export const STORE = {
  name: "GadgetVault",
  legalName: env("VITE_STORE_LEGAL_NAME") || "GadgetVault",
  tagline: "Premium Gadgets & Accessories",
  description:
    env("VITE_STORE_DESCRIPTION") ||
    "Shop kitchen accessories, unique gadgets, and daily essentials with secure checkout and pan-India delivery.",
  email: env("VITE_STORE_EMAIL") || "support@gadgetvault.in",
  phone: env("VITE_STORE_PHONE"),
  whatsapp: env("VITE_STORE_WHATSAPP"),
  address: {
    line1: env("VITE_STORE_ADDRESS_LINE1"),
    city: env("VITE_STORE_ADDRESS_CITY"),
    state: env("VITE_STORE_ADDRESS_STATE"),
    pincode: env("VITE_STORE_ADDRESS_PINCODE"),
    country: env("VITE_STORE_ADDRESS_COUNTRY") || "India",
  },
  gstin: env("VITE_STORE_GSTIN"),
  hours: env("VITE_STORE_HOURS") || "Mon–Sat, 10:00 AM – 7:00 PM IST",
  freeShippingMin: Number(env("VITE_STORE_FREE_SHIPPING_MIN") || 999),
  standardShippingFee: Number(env("VITE_STORE_SHIPPING_FEE") || 79),
  deliveryDays: env("VITE_STORE_DELIVERY_DAYS") || "7–14 business days (estimate)",
  codAvailable: env("VITE_STORE_COD") !== "false",
} as const;

export const POLICY_LINKS = [
  { label: "Terms & Conditions", to: "/terms" as const },
  { label: "Privacy Policy", to: "/privacy" as const },
  { label: "Refund & Cancellation", to: "/refund" as const },
  { label: "Shipping & Delivery", to: "/shipping" as const },
  { label: "Fulfillment Policy", to: "/fulfillment" as const },
  { label: "Disclaimer", to: "/disclaimer" as const },
  { label: "Grievance Redressal", to: "/grievance" as const },
  { label: "Contact Us", to: "/contact" as const },
  { label: "About Us", to: "/about" as const },
] as const;

export function fullAddress(): string | null {
  const a = STORE.address;
  const parts = [a.line1, a.city, a.state, a.pincode, a.country].filter(Boolean);
  return parts.length >= 2 ? parts.join(", ") : null;
}

export function hasPhone(): boolean {
  return Boolean(STORE.phone);
}

export function hasGstin(): boolean {
  return Boolean(STORE.gstin);
}
