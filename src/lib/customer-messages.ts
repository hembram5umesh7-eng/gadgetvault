/** Map internal/technical errors to shopper-friendly copy (no retry/sync jargon). */

const TECHNICAL_PATTERN =
  /shopify|sync|draft order|graphql|admin api|supabase|postgres|constraint|violates|retry|webhook|gid:\/\//i;

export function friendlyShopperError(raw: unknown, fallback = "Something went wrong. Please try again."): string {
  const msg = raw instanceof Error ? raw.message : String(raw ?? "");
  const m = msg.trim();
  if (!m) return fallback;

  if (/invalid login|invalid credentials|wrong email/i.test(m)) {
    return "Wrong email or password. Please check and try again.";
  }
  if (/phone is invalid|valid 10-digit/i.test(m)) {
    return "Enter a valid 10-digit mobile number (no leading 0).";
  }
  if (/payment.*(fail|cancel)|signature|razorpay/i.test(m)) {
    return "Payment could not be completed. If amount was deducted, it will be refunded in 5–7 business days.";
  }
  if (/network|fetch|timeout|failed to fetch|abort/i.test(m)) {
    return "Connection issue. Check your internet and try again.";
  }
  if (/cart is empty|variant info missing/i.test(m)) {
    return m;
  }
  if (/terms|privacy/i.test(m)) {
    return m;
  }
  if (/coupon|referral|invalid code/i.test(m)) {
    return m.length > 140 ? "Invalid or expired code." : m;
  }
  if (TECHNICAL_PATTERN.test(m)) {
    return fallback;
  }
  if (m.length > 100) {
    return fallback;
  }
  return m;
}

export const ORDER_CONFIRMED_MESSAGE = "Order placed successfully! We'll email you updates.";
export const PAYMENT_SUCCESS_MESSAGE = (orderNumber: string) =>
  `Payment successful. Order ${orderNumber} is confirmed.`;
export const PAYMENT_CANCELLED_MESSAGE =
  "Payment cancelled. Your order is saved — you can complete payment from My Orders.";
