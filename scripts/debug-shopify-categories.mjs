const domain = process.env.VITE_SHOPIFY_STORE_DOMAIN;
const token = process.env.VITE_SHOPIFY_STOREFRONT_TOKEN;

async function q(query, variables) {
  const res = await fetch(`https://${domain}/api/2024-10/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

const all = await q(`query { products(first: 20) { edges { node { title handle productType tags collections(first:2){edges{node{handle title}}} } } } }`);
console.log("Headless products:", all.data?.products?.edges?.length ?? 0);
if (all.errors) console.log("errors:", all.errors);
for (const e of all.data?.products?.edges ?? []) {
  console.log("-", e.node.title.slice(0, 70));
  console.log("  handle:", e.node.handle);
}

const handles = [
  "kitchen-cupboard-organization-drawer-organizer-pegboard-tray",
  "kitchen-cupboard-organization-drawer-organizer-pegboard-tray-1",
];

for (const h of handles) {
  const j = await q(`query($h: String!) { productByHandle(handle: $h) { title } }`, { h });
  console.log(h, "→", j.data?.productByHandle?.title ?? "NOT ON HEADLESS");
}
