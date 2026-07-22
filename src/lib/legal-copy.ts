import { STORE, fullAddress, hasGstin, hasPhone } from "@/lib/store-info";

/** Single source for legal page dates — update when policies change. */
export const LEGAL_LAST_UPDATED = "July 21, 2026";

/** Honest delivery windows — estimates only, not guarantees. */
export const DELIVERY_ESTIMATES = {
  /** After payment confirmed, before partner dispatch */
  processingDays: "1–2 business days",
  /** Partner warehouse prep + handover to courier */
  fulfillmentDays: "3–7 business days",
  /** India courier leg after dispatch */
  courierDays: "3–7 business days",
  /** Total typical range shown to customers */
  totalTypical: "7–14 business days (metros & major cities)",
  /** Remote / extended */
  remoteTypical: "up to 21 business days (remote pin codes)",
  /** When delays are common */
  extendedNote:
    "During festivals, sale periods, stock shortages, or courier disruption, delivery may take longer. We will keep you updated by email.",
} as const;

export function contactBlock(): string {
  const parts = [`Email: ${STORE.email}`];
  if (hasPhone()) parts.push(`Phone: ${STORE.phone}`);
  if (fullAddress()) parts.push(`Address: ${fullAddress()}`);
  if (hasGstin()) parts.push(`GSTIN: ${STORE.gstin}`);
  return parts.join(" · ");
}

export const SHOPIFY_FULFILLMENT_SUMMARY =
  "Products on GadgetVault are listed and fulfilled through trusted Indian fulfilment and dropshipping partners. " +
  "When you place an order, we confirm payment, transmit fulfilment instructions, and coordinate dispatch to your address in India. " +
  "Courier partners provide last-mile delivery and tracking where available. COD orders may be verified before dispatch. " +
  "We do not disclose third-party fulfilment partner brand names on this website — partner selection is handled on our backend.";

export const NO_FRAUD_CLAUSE =
  "GadgetVault does not guarantee a specific delivery date unless explicitly stated in writing for a particular promotional campaign. " +
  "All timelines on this website are estimates. By placing an order, you acknowledge that delays may occur without constituting fraud or breach of contract, " +
  "provided we act in good faith to fulfil your order or offer refund/cancellation as per our Refund Policy.";
