import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { canCustomerCancel, type OrderStatus } from "@/lib/order-utils";
import { processCJOrderCancel } from "@/lib/cj-dropshipping.functions";

const cancelInput = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

/** Customer cancels own order before it is packed/shipped. */
export const cancelCustomerOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => cancelInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: order, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, status, payment_status, payment_method, order_number, cj_order_id")
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
      : "Customer cancelled from account";

    const { error: updErr } = await supabaseAdmin
      .from("orders")
      .update({
        status: "cancelled",
        notes: note,
      })
      .eq("id", data.orderId);

    if (updErr) throw new Error(updErr.message);

    let cjNote: string | undefined;
    if (order.cj_order_id) {
      const cjRes = await processCJOrderCancel(data.orderId, note);
      cjNote = cjRes.cjCancelled
        ? "Supplier (CJ) order cancelled automatically."
        : "Local cancel done — admin may need to cancel in CJ dashboard if order was already processing.";
    }

    return {
      ok: true as const,
      orderNumber: order.order_number,
      cjNote,
      refundNote:
        order.payment_status === "paid"
          ? "Your payment refund will be processed within 5–7 business days."
          : undefined,
    };
  });
