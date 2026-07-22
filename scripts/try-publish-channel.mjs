import { resolveAdminToken } from "./shopify-admin-auth.mjs";

const domain = process.env.VITE_SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
const token = await resolveAdminToken();
const GADGETVAULT_CHANNEL = "gid://shopify/Channel/290413740347";

async function gql(query, variables) {
  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  return json;
}

// Try publish mutations without listing products first
const productId = "gid://shopify/Product/10490328777019"; // kitchen organizer from admin URL

const attempts = [
  [
    "publishablePublishToCurrentChannel",
    `mutation($id: ID!) {
      publishablePublishToCurrentChannel(id: $id) {
        publishable { ... on Product { id title } }
        userErrors { field message }
      }
    }`,
    { id: productId },
  ],
  [
    "publishablePublish with channel",
    `mutation($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        userErrors { field message }
      }
    }`,
    { id: productId, input: [{ publicationId: GADGETVAULT_CHANNEL }] },
  ],
  [
    "productUpdate published",
    `mutation($input: ProductInput!) {
      productUpdate(input: $input) {
        product { id title }
        userErrors { field message }
      }
    }`,
    { input: { id: productId } },
  ],
  [
    "channel product listing",
    `mutation($productId: ID!, $channelId: ID!) {
      publishablePublish(id: $productId, input: [{ channelId: $channelId }]) {
        userErrors { field message }
      }
    }`,
    { productId, channelId: GADGETVAULT_CHANNEL },
  ],
];

for (const [name, query, variables] of attempts) {
  const j = await gql(query, variables);
  console.log(`\n=== ${name} ===`);
  if (j.errors) console.log("errors:", j.errors.map((e) => e.message).join("; "));
  else console.log(JSON.stringify(j.data, null, 2));
}

// REST publish attempts
for (const path of [
  `/products/10490328777019/publish.json`,
  `/publications/290413740347/product_publications.json`,
]) {
  const res = await fetch(`https://${domain}/admin/api/2024-10${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ product_publication: { product_id: 10490328777019 } }),
  });
  console.log(`\nREST POST ${path} → ${res.status}`, (await res.text()).slice(0, 200));
}
