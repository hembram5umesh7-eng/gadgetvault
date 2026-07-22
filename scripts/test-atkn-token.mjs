const token = process.argv[2] || process.env.SHOPIFY_AUTOMATION_TOKEN?.trim();
if (!token) {
  console.error("Usage: node --env-file=.env scripts/test-atkn-token.mjs [token]");
  console.error("Or set SHOPIFY_AUTOMATION_TOKEN in .env");
  process.exit(1);
}
const domain = "gharstoreessential.myshopify.com";

async function gql(accessToken, query) {
  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": accessToken },
    body: JSON.stringify({ query }),
  });
  return { status: res.status, json: await res.json() };
}

console.log("Testing token prefix:", token.slice(0, 8));

const tests = [
  "query { shop { name } }",
  "query { products(first: 2) { edges { node { id title } } } }",
  "query { publications(first: 3) { edges { node { id name } } } }",
];

for (const q of tests) {
  const { status, json } = await gql(token, q);
  console.log("\n", q.slice(0, 45));
  console.log(" status:", status, json.errors?.[0]?.message || JSON.stringify(json.data)?.slice(0, 150));
}

// Try Partners / CLI endpoints
const partners = await fetch("https://partners.shopify.com/api/cli/apps", {
  headers: { Authorization: `Bearer ${token}` },
});
console.log("\nPartners API:", partners.status, (await partners.text()).slice(0, 200));

// OAuth with env credentials
const id = process.env.SHOPIFY_CLIENT_ID;
const secret = process.env.SHOPIFY_CLIENT_SECRET;
if (id && secret) {
  const oauth = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
  });
  const text = await oauth.text();
  console.log("\nOAuth client_credentials:", oauth.status, text.slice(0, 300));
  if (oauth.ok) {
    const { access_token, scope } = JSON.parse(text);
    console.log("OAuth scopes:", scope);
    const p = await gql(access_token, "query { products(first: 1) { edges { node { title } } } }");
    console.log("OAuth products:", p.json.errors?.[0]?.message || "OK");
  }
}
