/**
 * Push GadgetVault cancelled orders → Shopify cancel
 * Run: node --env-file=.env scripts/push-cancelled-to-shopify.mjs
 */
import { resolveAdminToken } from "./shopify-admin-auth.mjs";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const domain = (process.env.VITE_SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

async function sb(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return res.json();
}

function gidNumeric(gid) {
  return String(gid).split("/").pop();
}

async function fetchDraftOrderId(token, draftNumericId) {
  const res = await fetch(`https://${domain}/admin/api/2024-10/draft_orders/${draftNumericId}.json`, {
    headers: { "X-Shopify-Access-Token": token },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.draft_order?.order_id ?? null;
}

async function fetchShopifyOrder(token, numericId) {
  const res = await fetch(`https://${domain}/admin/api/2024-10/orders/${numericId}.json`, {
    headers: { "X-Shopify-Access-Token": token },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.order ?? null;
}

async function cancelOrderRest(token, numericId) {
  const res = await fetch(`https://${domain}/admin/api/2024-10/orders/${numericId}/cancel.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason: "customer", email: false, refund: false, restock: true }),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

async function resolveOrderNumericId(token, shopifyOrderId, shopifyDraftOrderId) {
  const candidates = [shopifyOrderId, shopifyDraftOrderId].filter(Boolean);

  for (const raw of candidates) {
    if (String(raw).includes("/Order/") || /^\d+$/.test(String(raw))) {
      const num = gidNumeric(raw);
      const order = await fetchShopifyOrder(token, num);
      if (order) return num;
    }
  }

  for (const raw of candidates) {
    const draftNum = gidNumeric(raw);
    const orderId = await fetchDraftOrderId(token, draftNum);
    if (orderId) return String(orderId);
  }

  return null;
}

const token = await resolveAdminToken();
const cancelled = await sb(
  "orders?status=eq.cancelled&select=id,order_number,shopify_order_id,shopify_draft_order_id&order=created_at.desc&limit=20",
);

console.log(`Found ${cancelled.length} cancelled orders in GadgetVault\n`);

for (const row of cancelled) {
  console.log(`--- ${row.order_number} ---`);
  console.log("  shopify_order_id:", row.shopify_order_id);
  console.log("  shopify_draft_order_id:", row.shopify_draft_order_id);

  const numericId = await resolveOrderNumericId(token, row.shopify_order_id, row.shopify_draft_order_id);
  if (!numericId) {
    console.log("  ✗ Could not resolve Shopify order id");
    continue;
  }

  const remote = await fetchShopifyOrder(token, numericId);
  console.log("  Shopify #", numericId, "cancelled_at:", remote?.cancelled_at ?? "n/a");

  if (remote?.cancelled_at) {
    console.log("  ✓ Already cancelled in Shopify");
    if (row.shopify_order_id !== `gid://shopify/Order/${numericId}`) {
      await fetch(`${url}/rest/v1/orders?id=eq.${row.id}`, {
        method: "PATCH",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ shopify_order_id: `gid://shopify/Order/${numericId}` }),
      });
      console.log("  ✓ Fixed shopify_order_id in Supabase");
    }
    continue;
  }

  const result = await cancelOrderRest(token, numericId);
  if (result.ok) {
    console.log("  ✓ Cancelled in Shopify");
    await fetch(`${url}/rest/v1/orders?id=eq.${row.id}`, {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ shopify_order_id: `gid://shopify/Order/${numericId}` }),
    });
  } else {
    console.log("  ✗ Cancel failed:", result.status, result.body.slice(0, 300));
  }
}

console.log("\nDone.");
