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

const queries = {
  shop: `query { shop { name myshopifyDomain } }`,
  storefrontTokens: `query { storefrontAccessTokens(first: 10) { edges { node { id accessToken title } } } }`,
  channel: `query { channel(id: "gid://shopify/Channel/290413740347") { id name } }`,
  onlineChannel: `query { channel(id: "gid://shopify/Channel/289832403259") { id name } }`,
};

for (const [name, query] of Object.entries(queries)) {
  const j = await gql(query);
  console.log(`\n${name}:`);
  if (j.errors) console.log("  error:", j.errors[0].message);
  else console.log(" ", JSON.stringify(j.data));
}
