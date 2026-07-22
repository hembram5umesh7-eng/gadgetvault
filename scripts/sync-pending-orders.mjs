/**
 * Sync all pending Supabase orders to Shopify Admin.
 * Run: node --env-file=.env scripts/sync-pending-orders.mjs
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

async function gql(token, query, variables) {
  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data;
}

function shopifyOrderEmail(email, orderNumber) {
  const fallback = process.env.VITE_STORE_EMAIL?.trim() || "hansdamiand@gmail.com";
  if (!email || !email.includes("@")) return fallback;
  if (/@gadgetvault\.in$/i.test(email)) return fallback;
  return email;
}

function normalizeShopifyPhone(phone) {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 10) return `+91${digits.slice(-10)}`;
  return "+919876543210";
}

const token = await resolveAdminToken();
const pending = await sb(
  "orders?shopify_order_id=is.null&status=neq.cancelled&select=id,order_number,user_id,ship_phone,ship_full_name,ship_line1,ship_line2,ship_city,ship_state,ship_pincode,discount_amount,coupon_code,payment_method&order=created_at.asc&limit=50",
);

console.log(`Pending orders: ${pending.length}\n`);

let ok = 0;
let fail = 0;

for (const order of pending) {
  try {
    const items = await sb(`order_items?order_id=eq.${order.id}&select=*`);
    if (!items.length) throw new Error("no items");
    const missing = items.find((i) => !i.shopify_variant_id);
    if (missing) throw new Error("missing shopify_variant_id on " + missing.product_name);

    const userRes = await fetch(`${url}/auth/v1/admin/users/${order.user_id}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const userJson = userRes.ok ? await userRes.json() : null;
    const email = shopifyOrderEmail(userJson?.email, order.order_number);

    const input = {
      email,
      phone: normalizeShopifyPhone(order.ship_phone),
      lineItems: items.map((it) => ({
        variantId: it.shopify_variant_id,
        quantity: it.quantity,
        customAttributes: [
          { key: "size", value: it.size || "" },
          { key: "color", value: it.color || "" },
        ],
      })),
      shippingAddress: {
        firstName: order.ship_full_name,
        address1: order.ship_line1,
        address2: order.ship_line2 || undefined,
        city: order.ship_city,
        province: order.ship_state,
        zip: order.ship_pincode,
        country: "IN",
        phone: normalizeShopifyPhone(order.ship_phone),
      },
      note: `GadgetVault order ${order.order_number}`,
      tags: ["gadgetvault", order.payment_method],
    };

    const draft = await gql(
      token,
      `mutation($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder { id legacyResourceId }
          userErrors { message }
        }
      }`,
      { input },
    );

    const err = draft.draftOrderCreate?.userErrors?.[0]?.message;
    if (err) throw new Error(err);

    const draftGid = draft.draftOrderCreate.draftOrder.id;

    const complete = await gql(
      token,
      `mutation($id: ID!, $paymentPending: Boolean) {
        draftOrderComplete(id: $id, paymentPending: $paymentPending) {
          draftOrder { id status }
          userErrors { message }
        }
      }`,
      { id: draftGid, paymentPending: order.payment_method === "cod" },
    );

    const completeErr = complete.draftOrderComplete?.userErrors?.[0]?.message;
    if (completeErr) throw new Error(completeErr);

    const draftNumeric = draftGid.split("/").pop();
    let shopifyOrderGid = draftGid;
    if (draftNumeric) {
      const rest = await fetch(`https://${domain}/admin/api/2024-10/draft_orders/${draftNumeric}.json`, {
        headers: { "X-Shopify-Access-Token": token },
      });
      if (rest.ok) {
        const body = await rest.json();
        const orderId = body.draft_order?.order_id;
        if (orderId) shopifyOrderGid = `gid://shopify/Order/${orderId}`;
      }
    }

    await fetch(`${url}/rest/v1/orders?id=eq.${order.id}`, {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        shopify_draft_order_id: draftGid,
        shopify_order_id: shopifyOrderGid,
      }),
    });

    console.log(`✓ ${order.order_number} → Shopify ${shopifyOrderGid ?? draftGid}`);
    ok++;
  } catch (e) {
    console.log(`✗ ${order.order_number}: ${e.message}`);
    fail++;
  }
}

console.log(`\nDone: ${ok} synced, ${fail} failed`);
