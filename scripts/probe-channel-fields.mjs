import { resolveAdminToken } from "./shopify-admin-auth.mjs";

const domain = "gharstoreessential.myshopify.com";
const token = await resolveAdminToken();

async function gql(query) {
  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

const queries = [
  `query { channel(id: "gid://shopify/Channel/290413740347") { id name } }`,
  `query { shop { id name } }`,
];

for (const q of queries) {
  console.log("\n", q.slice(0, 80));
  const j = await gql(q);
  console.log(JSON.stringify(j, null, 2).slice(0, 500));
}

// Try introspection for Channel type fields
const intro = await gql(`query { __type(name: "Channel") { fields { name } } }`);
console.log("\nChannel fields:", intro.data?.__type?.fields?.map((f) => f.name).join(", "));
