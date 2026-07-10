import { STORE } from "@/lib/store-info";

export const STORE_FAQ = [
  {
    q: "Where do products come from?",
    a: "Products are listed from our supplier catalog (including CJ Dropshipping). Each product page shows the details provided by the supplier.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept Cash on Delivery (COD) where available and online payments via Razorpay — UPI, credit/debit cards, netbanking, and wallets.",
  },
  {
    q: "How long does delivery take?",
    a: "Orders are processed after payment confirmation. Delivery typically takes 3–7 business days across India depending on your pincode and courier.",
  },
  {
    q: "Do you offer EMI?",
    a: "EMI may be available at Razorpay checkout depending on your bank and card. We do not guarantee EMI on every product.",
  },
  {
    q: "Can I return a defective product?",
    a: "Report damage or defects within 48 hours of delivery with photos. See our Refund & Cancellation Policy for full terms.",
  },
  {
    q: "Is free shipping available?",
    a: `Free shipping on orders above ₹${STORE.freeShippingMin}. Below that, a ₹${STORE.standardShippingFee} shipping fee applies.`,
  },
] as const;
