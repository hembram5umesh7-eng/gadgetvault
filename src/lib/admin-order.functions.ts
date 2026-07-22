import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { cancelShopifyOrderForGadgetVault } from "@/integrations/shopify/admin";
import { refundPaidOrder } from "@/lib/razorpay-refund";
import type { OrderStatus } from "@/lib/order-utils";

async function assertStaffOrAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("staff")) throw new Error("Forbidden");
}

async function assertSuperAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  if (!data?.some((r) => r.role === "admin")) throw new Error("Forbidden: super admin only");
}

const cancelInput = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
  refund: z.boolean().optional(),
});

/** Admin cancels order — optional Razorpay refund + Shopify cancel. */
export const cancelAdminOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => cancelInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);

    const { data: order, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select(
        "id, status, payment_status, payment_method, order_number, shopify_order_id, shopify_draft_order_id",
      )
      .eq("id", data.orderId)
      .single();

    if (fetchErr || !order) throw new Error("Order not found");
    if (order.status === "cancelled") throw new Error("Order already cancelled");

    const note = data.reason?.trim()
      ? `Admin cancelled: ${data.reason.trim()}`
      : "Cancelled from GadgetVault admin panel";

    let refundNote: string | undefined;
    const shouldRefund = data.refund !== false;
    if (shouldRefund && order.payment_status === "paid" && order.payment_method === "razorpay") {
      try {
        const refund = await refundPaidOrder({
          orderId: order.id,
          orderNumber: order.order_number,
          reason: note,
        });
        refundNote = refund.message;
      } catch (err) {
        refundNote = err instanceof Error ? err.message : "Refund failed";
      }
    } else if (order.payment_method === "cod") {
      refundNote = "COD — no refund needed";
    }

    if (order.shopify_order_id || order.shopify_draft_order_id) {
      try {
        await cancelShopifyOrderForGadgetVault({
          shopifyOrderId: order.shopify_order_id,
          shopifyDraftOrderId: order.shopify_draft_order_id,
          note,
        });
      } catch (err) {
        console.error("[admin cancel] Shopify sync failed:", err);
      }
    }

    const { error: updErr } = await supabaseAdmin
      .from("orders")
      .update({ status: "cancelled" as OrderStatus, notes: note, admin_notes: note })
      .eq("id", data.orderId);

    if (updErr) throw new Error(updErr.message);

    return {
      ok: true as const,
      orderNumber: order.order_number,
      refundNote,
      message: `${order.order_number} cancelled`,
    };
  });

const deleteOneInput = z.object({ orderId: z.string().uuid() });

async function deleteOrdersByIds(orderIds: string[]) {
  if (!orderIds.length) return { deleted: 0, orderNumbers: [] as string[] };

  const { data: rows } = await supabaseAdmin
    .from("orders")
    .select("id, order_number")
    .in("id", orderIds);

  const { error } = await supabaseAdmin.from("orders").delete().in("id", orderIds);
  if (error) throw new Error(error.message);

  return {
    deleted: rows?.length ?? orderIds.length,
    orderNumbers: (rows ?? []).map((r) => r.order_number),
  };
}

/** Permanently delete one order (+ items + payments via cascade). */
export const deleteAdminOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deleteOneInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);
    const result = await deleteOrdersByIds([data.orderId]);
    return {
      ok: true as const,
      ...result,
      message: result.deleted
        ? `Deleted ${result.orderNumbers[0] ?? "order"} permanently`
        : "Order not found",
    };
  });

const deleteBulkInput = z.object({
  orderIds: z.array(z.string().uuid()).min(1).max(200),
});

/** Delete multiple selected orders. */
export const deleteAdminOrdersBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deleteBulkInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);
    const result = await deleteOrdersByIds(data.orderIds);
    return {
      ok: true as const,
      ...result,
      message: `${result.deleted} order(s) deleted permanently`,
    };
  });

const purgeInput = z.object({
  confirm: z.literal("DELETE ALL ORDERS"),
});

/** Delete every order — super admin only. Categories/products untouched. */
export const purgeAllAdminOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => purgeInput.parse(input))
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);

    const { count } = await supabaseAdmin.from("orders").select("id", { count: "exact", head: true });
    const { error } = await supabaseAdmin.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(error.message);

    return {
      ok: true as const,
      deleted: count ?? 0,
      message: `All ${count ?? 0} orders deleted. Fresh start ready.`,
    };
  });
