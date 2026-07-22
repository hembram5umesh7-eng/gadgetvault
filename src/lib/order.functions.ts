import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { canCustomerCancel, type OrderStatus } from "@/lib/order-utils";
import { cancelShopifyOrderForGadgetVault } from "@/integrations/shopify/admin";
import { refundPaidOrder } from "@/lib/razorpay-refund";

const cancelInput = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

/** Customer cancels own order — auto Razorpay refund + Shopify sync. */
export const cancelCustomerOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => cancelInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: order, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, status, payment_status, payment_method, order_number, shopify_order_id, shopify_draft_order_id")
      .eq("id", data.orderId)
      .single();

    if (fetchErr || !order) throw new Error("Order not found");
    if (order.user_id !== userId) throw new Error("You cannot cancel this order");

    const status = order.status as OrderStatus;
    if (status === "cancelled") throw new Error("Order is already cancelled");
    if (!canCustomerCancel(status)) {
      throw new Error("This order has already been packed or shipped and cannot be cancelled online. Contact support for returns.");
    }

    const note = data.reason?.trim()
      ? `Customer cancelled: ${data.reason.trim()}`
      : "Customer cancelled from GadgetVault";

    let refundNote: string | undefined;
    if (order.payment_status === "paid" && order.payment_method === "razorpay") {
      try {
        const refund = await refundPaidOrder({
          orderId: order.id,
          orderNumber: order.order_number,
          reason: note,
        });
        refundNote = refund.message;
      } catch (err) {
        refundNote = err instanceof Error ? err.message : "Refund could not be started — support will contact you";
      }
    } else if (order.payment_method === "cod") {
      refundNote = "COD order cancelled — no payment was collected.";
    }

    const shopifyId = order.shopify_order_id || order.shopify_draft_order_id;
    if (shopifyId) {
      try {
        await cancelShopifyOrderForGadgetVault({
          shopifyOrderId: order.shopify_order_id,
          shopifyDraftOrderId: order.shopify_draft_order_id,
          note,
        });
      } catch (err) {
        console.error("[cancel] Shopify sync failed:", err);
      }
    }

    const { error: updErr } = await supabaseAdmin
      .from("orders")
      .update({
        status: "cancelled",
        notes: note,
      })
      .eq("id", data.orderId);

    if (updErr) throw new Error(updErr.message);

    return {
      ok: true as const,
      orderNumber: order.order_number,
      refundNote,
    };
  });
