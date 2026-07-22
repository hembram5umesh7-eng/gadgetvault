import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { shopifyStoreDomain } from "@/integrations/shopify/config";
import { fetchInstalledShopifyScopes, resolveShopifyAdminAccessTokenForOrders, shopifyTokenHasOrderScopes } from "@/integrations/shopify/admin-auth";
import {
  cancelShopifyOrderForGadgetVault,
  resolveShopifyOrderGid,
} from "@/integrations/shopify/admin";
import type { OrderStatus } from "@/lib/order-utils";

export type ShopifyOrderWebhookPayload = {
  id?: number;
  admin_graphql_api_id?: string;
  name?: string;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  fulfillment_status?: string | null;
  financial_status?: string | null;
  tags?: string;
  note?: string;
  closed_at?: string | null;
};

function gidNumeric(gid: string): string {
  return gid.split("/").pop() ?? gid;
}

/** All ID forms we may have stored in Supabase. */
export function shopifyOrderIdCandidates(payload: ShopifyOrderWebhookPayload): string[] {
  const ids = new Set<string>();
  if (payload.admin_graphql_api_id) {
    ids.add(payload.admin_graphql_api_id);
    ids.add(gidNumeric(payload.admin_graphql_api_id));
  }
  if (payload.id != null) {
    ids.add(String(payload.id));
    ids.add(`gid://shopify/Order/${payload.id}`);
  }
  if (payload.name) {
    const num = payload.name.replace(/^#/, "").trim();
    if (num) {
      ids.add(num);
      ids.add(`gid://shopify/Order/${num}`);
    }
  }
  return [...ids];
}

function extractGadgetVaultOrderNumber(payload: ShopifyOrderWebhookPayload): string | null {
  const note = payload.note ?? "";
  const fromNote = note.match(/GadgetVault order\s+(TF\d+|GV\d+)/i);
  if (fromNote) return fromNote[1].toUpperCase();
  return null;
}

export async function findGadgetVaultOrderByShopifyPayload(payload: ShopifyOrderWebhookPayload) {
  for (const candidate of shopifyOrderIdCandidates(payload)) {
    const { data } = await supabaseAdmin
      .from("orders")
      .select("id, status, shopify_order_id, order_number")
      .eq("shopify_order_id", candidate)
      .maybeSingle();
    if (data) return data;

    const { data: byDraft } = await supabaseAdmin
      .from("orders")
      .select("id, status, shopify_order_id, order_number")
      .eq("shopify_draft_order_id", candidate)
      .maybeSingle();
    if (byDraft) return byDraft;
  }

  const orderNumber = extractGadgetVaultOrderNumber(payload);
  if (orderNumber) {
    const { data } = await supabaseAdmin
      .from("orders")
      .select("id, status, shopify_order_id, order_number")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (data) return data;
  }

  return null;
}

function mapInboundStatus(payload: ShopifyOrderWebhookPayload, topic?: string): OrderStatus | null {
  if (payload.cancelled_at || payload.cancel_reason || topic === "orders/cancelled") {
    return "cancelled";
  }

  const fulfillment = (payload.fulfillment_status ?? "").toLowerCase();
  if (fulfillment === "fulfilled") return "shipped";
  if (fulfillment === "partial") return "processing";

  return null;
}

export async function applyShopifyOrderInboundUpdate(
  payload: ShopifyOrderWebhookPayload,
  topic?: string,
): Promise<{ matched: boolean; orderId?: string; previousStatus?: string; newStatus?: string }> {
  const order = await findGadgetVaultOrderByShopifyPayload(payload);
  if (!order) return { matched: false };

  const nextStatus = mapInboundStatus(payload, topic);
  if (!nextStatus || nextStatus === order.status) {
    return { matched: true, orderId: order.id, previousStatus: order.status };
  }

  const note =
    nextStatus === "cancelled"
      ? `Cancelled via Shopify${payload.cancel_reason ? ` (${payload.cancel_reason})` : ""}`
      : undefined;

  const updates: Record<string, unknown> = { status: nextStatus };
  if (note) {
    updates.notes = note;
    updates.admin_notes = note;
  }
  if (payload.admin_graphql_api_id && !order.shopify_order_id) {
    updates.shopify_order_id = payload.admin_graphql_api_id;
  }

  await supabaseAdmin.from("orders").update(updates).eq("id", order.id);

  return {
    matched: true,
    orderId: order.id,
    previousStatus: order.status,
    newStatus: nextStatus,
  };
}

async function fetchShopifyOrderRest(numericId: string): Promise<ShopifyOrderWebhookPayload | null> {
  let token: string;
  try {
    token = await resolveShopifyAdminAccessTokenForOrders();
  } catch {
    return null;
  }
  const domain = shopifyStoreDomain();
  if (!token || !domain) return null;

  const res = await fetch(`https://${domain}/admin/api/2024-10/orders/${numericId}.json`, {
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
  });
  if (!res.ok) return null;

  const json = (await res.json()) as { order?: ShopifyOrderWebhookPayload };
  return json.order ?? null;
}

function numericFromStoredShopifyId(stored: string): string | null {
  const trimmed = stored.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  if (trimmed.includes("/Order/")) return gidNumeric(trimmed);
  return null;
}

/** Pull latest status from Shopify Admin for one linked order. */
export async function syncShopifyOrderStatusFromApi(shopifyOrderIdStored: string) {
  const numericId = numericFromStoredShopifyId(shopifyOrderIdStored);
  if (!numericId) return { ok: false as const, reason: "invalid_id" };

  const payload = await fetchShopifyOrderRest(numericId);
  if (!payload) return { ok: false as const, reason: "fetch_failed" };

  const result = await applyShopifyOrderInboundUpdate(payload, payload.cancelled_at ? "orders/cancelled" : "orders/updated");
  return { ok: true as const, ...result };
}

/** Admin refresh — sync all non-cancelled orders that have a Shopify link. */
export async function syncAllInboundShopifyOrderStatuses(limit = 100) {
  const { data: rows, error } = await supabaseAdmin
    .from("orders")
    .select("id, shopify_order_id, order_number, status")
    .not("shopify_order_id", "is", null)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  let updated = 0;
  let cancelled = 0;
  const errors: string[] = [];

  for (const row of rows ?? []) {
    if (!row.shopify_order_id) continue;
    try {
      const res = await syncShopifyOrderStatusFromApi(row.shopify_order_id);
      if (res.ok && res.newStatus) {
        updated++;
        if (res.newStatus === "cancelled") cancelled++;
      }
    } catch (err) {
      errors.push(`${row.order_number}: ${err instanceof Error ? err.message : "sync failed"}`);
    }
  }

  return { checked: rows?.length ?? 0, updated, cancelled, errors };
}

/** Push GadgetVault cancellations → Shopify (fixes orders cancelled locally but still open in Shopify). */
export async function pushCancelledOrdersToShopify(limit = 50) {
  const { data: rows, error } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, shopify_order_id, shopify_draft_order_id, notes")
    .eq("status", "cancelled")
    .or("shopify_order_id.not.is.null,shopify_draft_order_id.not.is.null")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  let pushed = 0;
  const errors: string[] = [];

  for (const row of rows ?? []) {
    if (!row.shopify_order_id && !row.shopify_draft_order_id) continue;

    try {
      const orderGid = await resolveShopifyOrderGid(row.shopify_order_id, row.shopify_draft_order_id);
      if (orderGid) {
        const numericId = numericFromStoredShopifyId(orderGid);
        if (numericId) {
          const remote = await fetchShopifyOrderRest(numericId);
          if (remote?.cancelled_at) continue;
        }
      }

      await cancelShopifyOrderForGadgetVault({
        shopifyOrderId: row.shopify_order_id,
        shopifyDraftOrderId: row.shopify_draft_order_id,
        note: row.notes ?? `GadgetVault ${row.order_number} cancelled`,
      });

      if (orderGid && row.shopify_order_id !== orderGid) {
        await supabaseAdmin.from("orders").update({ shopify_order_id: orderGid }).eq("id", row.id);
      }

      pushed++;
    } catch (err) {
      errors.push(`${row.order_number}: ${err instanceof Error ? err.message : "Shopify cancel failed"}`);
    }
  }

  return { checked: rows?.length ?? 0, pushed, errors };
}

/** Two-way order status sync with Shopify. */
export async function syncAllOrderStatusesWithShopify(limit = 100) {
  const inbound = await syncAllInboundShopifyOrderStatuses(limit);
  const outbound = await pushCancelledOrdersToShopify(limit);
  return { inbound, outbound };
}

const ORDER_WEBHOOK_TOPICS = ["orders/cancelled", "orders/updated"] as const;

export async function ensureShopifyOrderWebhooks(origin: string) {
  const token = await resolveShopifyAdminAccessToken();
  const domain = shopifyStoreDomain();
  if (!token || !domain) throw new Error("Shopify Admin API not configured");

  const address = `${origin.replace(/\/$/, "")}/api/webhooks/shopify/orders`;

  const listRes = await fetch(`https://${domain}/admin/api/2024-10/webhooks.json`, {
    headers: { "X-Shopify-Access-Token": token },
  });
  if (!listRes.ok) throw new Error(`Could not list webhooks: ${listRes.status}`);

  const listJson = (await listRes.json()) as {
    webhooks?: { id: number; topic: string; address: string }[];
  };
  const existing = listJson.webhooks ?? [];

  const created: string[] = [];
  const skipped: string[] = [];

  for (const topic of ORDER_WEBHOOK_TOPICS) {
    const already = existing.some((w) => w.topic === topic && w.address === address);
    if (already) {
      skipped.push(topic);
      continue;
    }

    const res = await fetch(`https://${domain}/admin/api/2024-10/webhooks.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ webhook: { topic, address, format: "json" } }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Webhook ${topic} failed: ${res.status} ${errText.slice(0, 200)}`);
    }
    created.push(topic);
  }

  return { address, created, skipped };
}
