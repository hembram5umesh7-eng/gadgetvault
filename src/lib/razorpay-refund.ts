import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRazorpayKeyId, resolveRazorpayKeySecret, resolveRazorpayWebhookSecret } from "@/lib/razorpay-token-store";

export async function verifyRazorpayWebhookSignature(body: string, signature: string | null): Promise<boolean> {
  const secret = await resolveRazorpayWebhookSecret();
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function razorpayAuthHeader(): Promise<string> {
  const keyId = await resolveRazorpayKeyId();
  const keySecret = await resolveRazorpayKeySecret();
  if (!keyId || !keySecret) throw new Error("Razorpay not configured");
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export async function initiateRazorpayRefund(opts: {
  paymentId: string;
  amountInr?: number;
  reason?: string;
}): Promise<{ refundId: string; status: string }> {
  const auth = await razorpayAuthHeader();
  const body: Record<string, unknown> = {};
  if (opts.amountInr != null) body.amount = Math.round(opts.amountInr * 100);
  if (opts.reason) body.notes = { reason: opts.reason.slice(0, 200) };

  const res = await fetch(`https://api.razorpay.com/v1/payments/${opts.paymentId}/refund`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Razorpay refund failed (${res.status}): ${text.slice(0, 200)}`);

  const json = JSON.parse(text) as { id?: string; status?: string };
  if (!json.id) throw new Error("Razorpay refund: no refund id returned");
  return { refundId: json.id, status: json.status ?? "processed" };
}

export async function refundPaidOrder(opts: {
  orderId: string;
  orderNumber: string;
  reason?: string;
}): Promise<{ ok: boolean; refundId?: string; message: string }> {
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id, provider_payment_id, amount, status, refund_id")
    .eq("order_id", opts.orderId)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (!payment?.provider_payment_id) {
    return { ok: false, message: "No paid Razorpay payment found for this order" };
  }
  if (payment.refund_id) {
    return { ok: true, refundId: payment.refund_id, message: "Refund already initiated" };
  }

  const result = await initiateRazorpayRefund({
    paymentId: payment.provider_payment_id,
    amountInr: Number(payment.amount),
    reason: opts.reason ?? `Cancel ${opts.orderNumber}`,
  });

  await supabaseAdmin
    .from("payments")
    .update({ refund_id: result.refundId, refund_status: result.status })
    .eq("id", payment.id);

  await supabaseAdmin
    .from("orders")
    .update({ payment_status: "refunded" })
    .eq("id", opts.orderId);

  return {
    ok: true,
    refundId: result.refundId,
    message: "Refund initiated — amount will return in 5–7 business days",
  };
}

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; status?: string } };
    refund?: { entity?: { id?: string; payment_id?: string; status?: string } };
  };
};

export async function handleRazorpayWebhook(body: string): Promise<{ ok: boolean; handled: string }> {
  const json = JSON.parse(body) as RazorpayWebhookPayload;
  const event = json.event ?? "";

  if (event === "payment.captured") {
    const paymentId = json.payload?.payment?.entity?.id;
    if (!paymentId) return { ok: true, handled: "payment.captured:skip" };

    const { data: row } = await supabaseAdmin
      .from("payments")
      .select("id, order_id")
      .eq("provider_payment_id", paymentId)
      .maybeSingle();

    if (row) {
      await supabaseAdmin.from("payments").update({ status: "paid" }).eq("id", row.id);
      await supabaseAdmin.from("orders").update({ payment_status: "paid" }).eq("id", row.order_id);
    }
    return { ok: true, handled: "payment.captured" };
  }

  if (event === "refund.processed" || event === "refund.created") {
    const refund = json.payload?.refund?.entity;
    if (!refund?.id) return { ok: true, handled: "refund:skip" };

    await supabaseAdmin
      .from("payments")
      .update({ refund_id: refund.id, refund_status: refund.status ?? "processed" })
      .eq("provider_payment_id", refund.payment_id ?? "");

    return { ok: true, handled: event };
  }

  if (event === "refund.failed") {
    const refund = json.payload?.refund?.entity;
    if (refund?.payment_id) {
      await supabaseAdmin
        .from("payments")
        .update({ refund_status: "failed" })
        .eq("provider_payment_id", refund.payment_id);
    }
    return { ok: true, handled: "refund.failed" };
  }

  return { ok: true, handled: `ignored:${event || "unknown"}` };
}
