import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  completeShopifyDraftOrder,
  createShopifyDraftOrder,
  shopifyAdminConfigured,
} from "@/integrations/shopify/admin";
import { normalizeShopifyPhone } from "@/lib/phone-utils";
import {
  syncAllInboundShopifyOrderStatuses,
  syncAllOrderStatusesWithShopify,
  syncShopifyOrderStatusFromApi,
} from "@/lib/shopify-order-inbound";
import { resolveShopifyOrderGid } from "@/integrations/shopify/admin";

function shopifyOrderEmail(email: string | undefined, _orderNumber: string): string {
  const fallback = process.env.VITE_STORE_EMAIL?.trim() || "hansdamiand@gmail.com";
  if (!email || !email.includes("@")) return fallback;
  if (/@gadgetvault\.in$/i.test(email)) return fallback;
  return email;
}

const SHOPIFY_SCOPE_HINT =
  "Admin → Shopify Connect page kholo, saare scopes wala naya token paste karo.";

function wrapShopifyError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (/write_draft_orders|read_draft_orders|access denied|Phone is invalid/i.test(msg)) {
    if (/Phone is invalid/i.test(msg)) {
      return new Error(`Shopify sync failed: invalid phone number. Use 10 digits without leading 0 (e.g. 6200104450). ${SHOPIFY_SCOPE_HINT}`);
    }
    return new Error(`Shopify order sync failed: ${msg}. ${SHOPIFY_SCOPE_HINT}`);
  }
  return err instanceof Error ? err : new Error(msg);
}

const lineItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive(),
  productName: z.string(),
  size: z.string(),
  color: z.string(),
});

const createOrderInput = z.object({
  email: z.string().email(),
  phone: z.string().min(10),
  lineItems: z.array(lineItemSchema).min(1),
  shipping: z.object({
    full_name: z.string().min(2),
    line1: z.string().min(3),
    line2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    pincode: z.string().min(4),
  }),
  discountAmount: z.number().min(0).default(0),
  discountLabel: z.string().optional(),
  paymentMethod: z.enum(["cod", "online"]),
  note: z.string().optional(),
});

async function syncDraftToShopify(data: z.infer<typeof createOrderInput>) {
  if (!shopifyAdminConfigured()) {
    throw new Error("Shopify Admin API not configured");
  }

  try {
    const draft = await createShopifyDraftOrder({
      email: data.email,
      phone: data.phone,
      lineItems: data.lineItems.map((it) => ({
        variantId: it.variantId,
        quantity: it.quantity,
        customAttributes: [
          { key: "size", value: it.size },
          { key: "color", value: it.color },
        ],
      })),
      shippingAddress: {
        firstName: data.shipping.full_name,
        address1: data.shipping.line1,
        address2: data.shipping.line2,
        city: data.shipping.city,
        province: data.shipping.state,
        zip: data.shipping.pincode,
        country: "India",
        phone: data.phone,
      },
      note: data.note,
      tags: ["gadgetvault", data.paymentMethod],
      appliedDiscount:
        data.discountAmount > 0
          ? {
              value: data.discountAmount,
              valueType: "FIXED_AMOUNT",
              title: data.discountLabel ?? "Discount",
            }
          : undefined,
    });

    const shopifyOrderId = await completeShopifyDraftOrder(
      draft.draftOrderId,
      data.paymentMethod === "cod",
    );

    let resolvedOrderId = shopifyOrderId;
    if (resolvedOrderId?.includes("DraftOrder")) {
      const linked = await resolveShopifyOrderGid(null, resolvedOrderId);
      if (linked) resolvedOrderId = linked;
    }

    return { draftOrderId: draft.draftOrderId, shopifyOrderId: resolvedOrderId };
  } catch (err) {
    throw wrapShopifyError(err);
  }
}

export const createShopifyStoreOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createOrderInput.parse(input))
  .handler(async ({ data }) => {
    const result = await syncDraftToShopify(data);
    return { ok: true as const, ...result };
  });

export const finalizeShopifyStoreOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ draftOrderId: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    try {
      const orderId = await completeShopifyDraftOrder(data.draftOrderId, false);
      return { ok: true as const, shopifyOrderId: orderId };
    } catch (err) {
      throw wrapShopifyError(err);
    }
  });

export async function syncOrderToShopifyById(orderId: string): Promise<{
  shopifyOrderId: string | null;
  draftOrderId: string;
}> {
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) throw new Error("Order not found");
  if (order.shopify_order_id) {
    return { shopifyOrderId: order.shopify_order_id, draftOrderId: order.shopify_draft_order_id ?? "" };
  }

  const { data: items, error: itemsErr } = await supabaseAdmin
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  if (itemsErr || !items?.length) throw new Error("Order has no line items");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", order.user_id)
    .maybeSingle();

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
  const email = shopifyOrderEmail(authUser.user?.email, order.order_number);

  const missingVariant = items.find((it) => !it.shopify_variant_id);
  if (missingVariant) throw new Error("Order item missing Shopify variant ID");

  const result = await syncDraftToShopify({
    email,
    phone: normalizeShopifyPhone(order.ship_phone),
    lineItems: items.map((it) => ({
      variantId: it.shopify_variant_id!,
      quantity: it.quantity,
      productName: it.product_name,
      size: it.size,
      color: it.color,
    })),
    shipping: {
      full_name: order.ship_full_name,
      line1: order.ship_line1,
      line2: order.ship_line2 ?? undefined,
      city: order.ship_city,
      state: order.ship_state,
      pincode: order.ship_pincode,
    },
    discountAmount: Number(order.discount_amount ?? 0),
    discountLabel: order.coupon_code ?? undefined,
    paymentMethod: order.payment_method === "cod" ? "cod" : "online",
    note: `GadgetVault order ${order.order_number}${profile?.full_name ? ` · ${profile.full_name}` : ""}`,
  });

  await supabaseAdmin
    .from("orders")
    .update({
      shopify_order_id: result.shopifyOrderId,
      shopify_draft_order_id: result.draftOrderId,
    })
    .eq("id", orderId);

  return result;
}

export const retryShopifyOrderSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: order } = await supabaseAdmin.from("orders").select("user_id, shopify_order_id").eq("id", data.orderId).single();
    if (!order) throw new Error("Order not found");

    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
    const isStaff = (roles ?? []).some((r) => r.role === "admin" || r.role === "staff");
    if (order.user_id !== context.userId && !isStaff) throw new Error("Access denied");

    if (order.shopify_order_id) {
      return { ok: true as const, shopifyOrderId: order.shopify_order_id, message: "Already synced to Shopify" };
    }

    const result = await syncOrderToShopifyById(data.orderId);
    return {
      ok: true as const,
      shopifyOrderId: result.shopifyOrderId,
      draftOrderId: result.draftOrderId,
      message: "Order synced to Shopify — Dropship India can fulfill now",
    };
  });

export const getCustomerOrderDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (orderErr) throw new Error(orderErr.message);
    if (!order) throw new Error("Order not found");

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: true });

    if (itemsErr) throw new Error(itemsErr.message);

    return { order, items: items ?? [] };
  });

/** Admin — pull cancel/fulfillment updates from Shopify for all linked orders. */
export const syncInboundShopifyOrderStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
    const isStaff = (roles ?? []).some((r) => r.role === "admin" || r.role === "staff");
    if (!isStaff) throw new Error("Admin access required");

    return syncAllOrderStatusesWithShopify(150);
  });

/** Customer order page — refresh status from Shopify then return latest order. */
export const refreshCustomerOrderFromShopify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (orderErr) throw new Error(orderErr.message);
    if (!order) throw new Error("Order not found");

    if (order.shopify_order_id) {
      await syncShopifyOrderStatusFromApi(order.shopify_order_id);
    }

    const { data: refreshed } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .single();

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: true });

    return { order: refreshed ?? order, items: items ?? [] };
  });
