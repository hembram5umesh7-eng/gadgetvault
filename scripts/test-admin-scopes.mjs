import { resolveAdminToken } from "./shopify-admin-auth.mjs";

const domain = process.env.VITE_SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
const token = await resolveAdminToken();

async function gql(query, variables) {
  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function rest(path) {
  const res = await fetch(`https://${domain}/admin/api/2024-10${path}`, {
    headers: { "X-Shopify-Access-Token": token },
  });
  return { status: res.status, body: await res.text() };
}

console.log("Token prefix:", token.slice(0, 8) + "...");

const tests = [
  ["products count", `query { productsCount { count } }`],
  ["products list", `query { products(first: 3) { edges { node { id title status } } } }`],
  ["publications", `query { publications(first: 5) { edges { node { id name } } } }`],
  ["channels", `query { channels(first: 10) { edges { node { id name } } } }`],
];

for (const [name, query] of tests) {
  const j = await gql(query);
  if (j.errors) console.log(`✗ ${name}:`, j.errors[0].message);
  else console.log(`✓ ${name}:`, JSON.stringify(j.data).slice(0, 200));
}

// REST endpoints
for (const path of ["/products/count.json", "/publications.json", "/custom_collections.json?limit=5"]) {
  const r = await rest(path);
  console.log(`REST ${path} → ${r.status}`, r.body.slice(0, 150));
}
