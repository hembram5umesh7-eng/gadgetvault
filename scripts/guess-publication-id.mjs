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

const pubIds = [
  "gid://shopify/Publication/290413740347",
  "gid://shopify/Publication/96359809339",
  "gid://shopify/Publication/1",
];

const productId = "gid://shopify/Product/10490328777019";

for (const pubId of pubIds) {
  const j = await gql(
    `mutation($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        userErrors { message }
      }
    }`,
    { id: productId, input: [{ publicationId: pubId }] },
  );
  console.log(pubId, "→", j.errors?.[0]?.message || JSON.stringify(j.data));
}
