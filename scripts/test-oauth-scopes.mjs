const domain = "gharstoreessential.myshopify.com";
const id = process.env.SHOPIFY_CLIENT_ID;
const secret = process.env.SHOPIFY_CLIENT_SECRET;
const scopes =
  "read_products,write_products,read_publications,write_publications,read_draft_orders,write_draft_orders,read_orders,write_orders";

async function test(label, body) {
  const r = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const t = await r.text();
  console.log(`\n${label}:`, r.status, t.slice(0, 500));
}

await test(
  "client_credentials no scope",
  new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
);
await test(
  "client_credentials with scope",
  new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret, scope: scopes }),
);

const shpat = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
if (shpat) {
  const r = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": shpat },
    body: JSON.stringify({ query: "query { products(first:1){edges{node{id title}}} }" }),
  });
  const j = await r.json();
  console.log("\nold shpat products:", j.errors?.[0]?.message || "OK");
}
