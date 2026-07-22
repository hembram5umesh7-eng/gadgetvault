import { STORE } from "@/lib/store-info";
import { DELIVERY_ESTIMATES } from "@/lib/legal-copy";

export const STORE_FAQ = [
  {
    q: "Where do products come from?",
    a: "Products are sourced and fulfilled through trusted Indian fulfilment partners. We coordinate dispatch to your address — partner names are not shown publicly. See our Fulfillment Policy for details.",
  },
  {
    q: "How long does delivery really take?",
    a: `Estimated ${DELIVERY_ESTIMATES.totalTypical} — not a guaranteed date. Processing (${DELIVERY_ESTIMATES.processingDays}), partner dispatch (${DELIVERY_ESTIMATES.fulfillmentDays}), then courier (${DELIVERY_ESTIMATES.courierDays}). Remote areas: ${DELIVERY_ESTIMATES.remoteTypical}.`,
  },
  {
    q: "Can I complain if delivery is late?",
    a: `Contact ${STORE.email} with your order number. Delays within our published estimates are not fraud. If fulfilment fails entirely, we refund per our Refund Policy. For disputes see Grievance Redressal.`,
  },
  {
    q: "What payment methods do you accept?",
    a: "Online payments via Razorpay (UPI, cards, netbanking, wallets). COD where shown at checkout.",
  },
  {
    q: "Can I return a defective product?",
    a: "Report damage or wrong item within 48 hours with photos. See Refund Policy. Opened hygiene products may not be returnable.",
  },
  {
    q: "Is free shipping available?",
    a: `Free shipping on orders above ₹${STORE.freeShippingMin} where offered. Otherwise ₹${STORE.standardShippingFee} standard fee shown at checkout.`,
  },
] as const;
