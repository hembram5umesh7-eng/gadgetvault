const domain = (process.env.VITE_SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const shpat = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();

async function gql(token, query, variables) {
  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

console.log("Testing shpat token...");
const scopes = await gql(shpat, `query { currentAppInstallation { accessScopes { handle } } }`);
console.log("Scopes:", scopes.data?.currentAppInstallation?.accessScopes?.map((s) => s.handle).join(", ") || scopes.errors);

const res = await fetch(`https://${domain}/admin/api/2024-10/orders/7555695935803/cancel.json`, {
  method: "POST",
  headers: { "X-Shopify-Access-Token": shpat, "Content-Type": "application/json" },
  body: JSON.stringify({ reason: "customer", email: false, refund: false, restock: true }),
});
console.log("REST cancel:", res.status, (await res.text()).slice(0, 300));

const get = await fetch(`https://${domain}/admin/api/2024-10/orders/7555695935803.json`, {
  headers: { "X-Shopify-Access-Token": shpat },
});
const getText = await get.text();
console.log("GET order:", get.status, get.ok ? JSON.stringify({ name: JSON.parse(getText).order?.name, cancelled: JSON.parse(getText).order?.cancelled_at }) : getText.slice(0, 200));
