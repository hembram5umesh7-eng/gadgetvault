import { resolveAdminToken } from "./shopify-admin-auth.mjs";

const domain = "gharstoreessential.myshopify.com";
const token = await resolveAdminToken();
const HEADLESS = "gid://shopify/Channel/290413740347";
const ONLINE = "gid://shopify/Channel/289832403259";

async function gql(query, variables) {
  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

const tests = [
  ["headless productsCount", `query($id: ID!) { channel(id: $id) { productsCount { count } } }`, { id: HEADLESS }],
  ["online productsCount", `query($id: ID!) { channel(id: $id) { productsCount { count } } }`, { id: ONLINE }],
  [
    "headless products",
    `query($id: ID!) { channel(id: $id) { products(first: 5) { edges { node { id title } } } } }`,
    { id: HEADLESS },
  ],
  [
    "online products",
    `query($id: ID!) { channel(id: $id) { products(first: 5) { edges { node { id title } } } } }`,
    { id: ONLINE },
  ],
  [
    "online productPublicationsV3",
    `query($id: ID!) { channel(id: $id) { productPublicationsV3(first: 5) { edges { node { publication { id name } product { id title } } } } } }`,
    { id: ONLINE },
  ],
];

for (const [name, query, variables] of tests) {
  const j = await gql(query, variables);
  console.log(`\n=== ${name} ===`);
  if (j.errors) console.log("error:", j.errors[0].message);
  else console.log(JSON.stringify(j.data, null, 2).slice(0, 800));
}

// Try publish via channel
const publishTests = [
  [
    "publishablePublishToCurrentChannel",
    `mutation($id: ID!) { publishablePublishToCurrentChannel(id: $id) { userErrors { message } } }`,
    { id: "gid://shopify/Product/10490328777019" },
  ],
  [
    "productPublish",
    `mutation($input: ProductPublishInput!) { productPublish(input: $input) { userErrors { message } } }`,
    { input: { id: "gid://shopify/Product/10490328777019", productPublications: [{ publicationId: HEADLESS }] } },
  ],
];

for (const [name, query, variables] of publishTests) {
  const j = await gql(query, variables);
  console.log(`\n=== MUTATION ${name} ===`);
  if (j.errors) console.log("error:", j.errors[0].message);
  else console.log(JSON.stringify(j.data, null, 2));
}
