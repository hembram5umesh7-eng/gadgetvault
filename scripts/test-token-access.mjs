const domain = "gharstoreessential.myshopify.com";
const id = process.env.SHOPIFY_CLIENT_ID;
const secret = process.env.SHOPIFY_CLIENT_SECRET;

const r = await fetch(`https://${domain}/admin/oauth/access_token`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
});
const { access_token, scope } = await r.json();
console.log("OAuth scope field:", JSON.stringify(scope));
console.log("Token:", access_token?.slice(0, 14) + "...");

const queries = [
  ["shop", "query { shop { name } }"],
  ["products", "query { products(first:2){edges{node{id title}}} }"],
  ["publications", "query { publications(first:3){edges{node{id name}}} }"],
  ["draftOrders", "query { draftOrders(first:1){edges{node{id}}} }"],
];

for (const [name, q] of queries) {
  const g = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": access_token },
    body: JSON.stringify({ query: q }),
  });
  const j = await g.json();
  console.log(name + ":", j.errors?.[0]?.message || "OK");
}

const oauthUrl = new URL(`https://${domain}/admin/oauth/authorize`);
oauthUrl.searchParams.set("client_id", id);
oauthUrl.searchParams.set(
  "scope",
  "read_products,write_products,read_publications,write_publications,read_draft_orders,write_draft_orders",
);
oauthUrl.searchParams.set("redirect_uri", "http://localhost:8080/api/shopify/auth/callback");
oauthUrl.searchParams.set("state", "test");
console.log("\nOAuth install URL (browser mein kholo after dev server start):\n" + oauthUrl.toString());
