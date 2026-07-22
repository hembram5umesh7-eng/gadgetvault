import { resolveAdminToken } from "./shopify-admin-auth.mjs";

const domain = (process.env.VITE_SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const token = await resolveAdminToken();

async function gql(query, variables) {
  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

// Check installed scopes
const scopes = await gql(`query { currentAppInstallation { accessScopes { handle } } }`);
console.log("Scopes:", scopes.data?.currentAppInstallation?.accessScopes?.map((s) => s.handle).join(", "));

// Try cancel via GraphQL
const cancel = await gql(
  `mutation($id: ID!) {
    orderCancel(orderId: $id, notifyCustomer: false, refund: false, restock: true, reason: CUSTOMER) {
      job { id }
      orderCancelUserErrors { message code }
    }
  }`,
  { id: "gid://shopify/Order/7555695935803" },
);
console.log("\nGraphQL cancel:", JSON.stringify(cancel, null, 2));

// Try REST cancel
const res = await fetch(`https://${domain}/admin/api/2024-10/orders/7555695935803/cancel.json`, {
  method: "POST",
  headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
  body: JSON.stringify({ reason: "customer", email: false, refund: false, restock: true }),
});
console.log("\nREST cancel:", res.status, await res.text());

// Draft order fetch (should work with read_draft_orders)
const draft = await fetch(`https://${domain}/admin/api/2024-10/draft_orders/1260068864315.json`, {
  headers: { "X-Shopify-Access-Token": token },
});
console.log("\nDraft fetch:", draft.status, draft.ok ? JSON.stringify((await draft.json()).draft_order?.order_id) : await draft.text());
