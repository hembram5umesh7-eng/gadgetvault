/** Public business details — used in footer, contact, and Razorpay compliance pages */
export const STORE = {
  name: "GadgetVault",
  legalName: "GadgetVault India",
  tagline: "Premium Gadgets & Accessories",
  description:
    "GadgetVault is India's trusted online store for genuine gadgets, accessories, and tech essentials — delivered fast with secure payments.",
  email: "support@gadgetvault.in",
  phone: "+91-9876543210",
  whatsapp: "+919876543210",
  address: {
    line1: "Plot 45, Electronics Hub, Sector 18",
    city: "Noida",
    state: "Uttar Pradesh",
    pincode: "201301",
    country: "India",
  },
  gstin: "09AABCG1234A1Z5",
  hours: "Mon–Sat, 10:00 AM – 7:00 PM IST",
  freeShippingMin: 999,
  standardShippingFee: 79,
  deliveryDays: "3–7 business days",
  codAvailable: true,
} as const;

export const POLICY_LINKS = [
  { label: "Privacy Policy", to: "/privacy" as const },
  { label: "Terms & Conditions", to: "/terms" as const },
  { label: "Refund & Cancellation", to: "/refund" as const },
  { label: "Shipping & Delivery", to: "/shipping" as const },
  { label: "Contact Us", to: "/contact" as const },
  { label: "About Us", to: "/about" as const },
] as const;

export function fullAddress() {
  const a = STORE.address;
  return `${a.line1}, ${a.city}, ${a.state} ${a.pincode}, ${a.country}`;
}
