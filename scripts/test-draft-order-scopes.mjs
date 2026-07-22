import { resolveAdminToken } from "./shopify-admin-auth.mjs";

const domain = "gharstoreessential.myshopify.com";
const token = await resolveAdminToken();

async function gql(query, variables) {
  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

const tests = [
  ["draftOrders", "query { draftOrders(first: 1) { edges { node { id } } } }"],
  ["orders", "query { orders(first: 1) { edges { node { id name } } } }"],
  [
    "draftOrderCreate",
    `mutation($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder { id }
        userErrors { message }
      }
    }`,
    {
      input: {
        email: "test@gadgetvault.in",
        lineItems: [{ variantId: "gid://shopify/ProductVariant/51435904762171", quantity: 1 }],
      },
    },
  ],
];

for (const [name, query, variables] of tests) {
  const j = await gql(query, variables);
  console.log(`\n${name}:`, j.errors?.[0]?.message || JSON.stringify(j.data).slice(0, 200));
}
