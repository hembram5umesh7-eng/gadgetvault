import { STORE, fullAddress, hasGstin, hasPhone } from "@/lib/store-info";

/** Single source for legal page dates — update when policies change. */
export const LEGAL_LAST_UPDATED = "July 12, 2026";

/** Honest delivery windows — NOT guarantees. CJ-sourced orders often take longer. */
export const DELIVERY_ESTIMATES = {
  /** After payment confirmed, before supplier dispatch */
  processingDays: "1–3 business days",
  /** CJ warehouse prep + handover to courier */
  fulfillmentDays: "5–15 business days",
  /** India courier leg after dispatch */
  courierDays: "5–12 business days",
  /** Total typical range shown to customers */
  totalTypical: "10–25 business days",
  /** When delays are common */
  extendedNote: "In rare cases (stock shortage, festival season, remote pin codes, courier disruption) delivery may take up to 30 business days or more.",
} as const;

export function contactBlock(): string {
  const parts = [`Email: ${STORE.email}`];
  if (hasPhone()) parts.push(`Phone: ${STORE.phone}`);
  if (fullAddress()) parts.push(`Address: ${fullAddress()}`);
  if (hasGstin()) parts.push(`GSTIN: ${STORE.gstin}`);
  return parts.join(" · ");
}

export const CJ_FULFILLMENT_SUMMARY =
  "Many products on GadgetVault are sourced and fulfilled through third-party dropshipping partners (including CJ Dropshipping). " +
  "We do not maintain physical inventory for every listing. After you place an order, we transmit it to the fulfillment partner who ships to your address. " +
  "Delivery timelines depend on supplier processing, logistics routing, and courier performance — not only on our website.";

export const NO_FRAUD_CLAUSE =
  "GadgetVault does not guarantee a specific delivery date unless explicitly stated in writing for a particular promotional campaign. " +
  "All timelines on this website are estimates. By placing an order, you acknowledge that delays may occur without constituting fraud or breach of contract, " +
  "provided we act in good faith to fulfil your order or offer refund/cancellation as per our Refund Policy.";
