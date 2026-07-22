import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { appPublicOrigin } from "@/lib/site-url";
import {
  razorpayConfigured,
  resolveRazorpayKeyId,
  saveStoredRazorpayKeys,
} from "@/lib/razorpay-token-store";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("staff")) throw new Error("Admin access required");
}

export const getPaymentGatewayStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const configured = await razorpayConfigured();
    const keyId = await resolveRazorpayKeyId();
    const fromEnv = Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
    const origin = appPublicOrigin();
    return {
      razorpayConfigured: configured,
      keyIdPreview: keyId ? `${keyId.slice(0, 12)}…` : null,
      source: fromEnv ? ("env" as const) : configured ? ("database" as const) : ("none" as const),
      webhookUrl: `${origin}/api/webhooks/razorpay`,
      checkoutUrls: ["/checkout", "/privacy", "/terms", "/refund", "/contact", "/about"].map(
        (p) => `${origin}${p}`,
      ),
    };
  });

export const saveRazorpayKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ keyId: z.string().min(10), keySecret: z.string().min(20) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await saveStoredRazorpayKeys(data.keyId, data.keySecret);

    const auth = Buffer.from(`${data.keyId.trim()}:${data.keySecret.trim()}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: 100, currency: "INR", receipt: "gv_test" }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Razorpay keys invalid: ${t.slice(0, 120)}`);
    }

    return { ok: true as const, message: "Razorpay connected! Online payments ab checkout par kaam karenge." };
  });

/** For checkout — no secret exposed. */
export const getCheckoutPaymentStatus = createServerFn({ method: "GET" }).handler(async () => {
  const configured = await razorpayConfigured();
  return { onlinePaymentsEnabled: configured };
});
