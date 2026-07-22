/**
 * Auto-set Headless Customer API callback URLs via Admin GraphQL (unstable).
 * Run: node --env-file=.env scripts/set-customer-api-urls.mjs
 */
import { resolveAdminToken } from "./shopify-admin-auth.mjs";

const domain = (process.env.VITE_SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const publicUrl = (process.env.VITE_APP_PUBLIC_URL || "https://gadgetvault.in").replace(/\/$/, "");
const vercelUrl = "https://gadgetvault-two.vercel.app";
const storefrontNumericId = process.env.SHOPIFY_HEADLESS_STOREFRONT_ID || "307797";

const origins = [...new Set([
  publicUrl,
  vercelUrl,
  "https://www.gadgetvault.in",
  "https://gadgetvault-eight.vercel.app",
])];

const urlsReplaceInput = {
  redirectUri: { add: origins.map((o) => `${o}/account/authorize`) },
  javascriptOrigin: { add: origins },
  logoutUris: { add: origins.map((o) => `${o}/account/logout`) },
};

async function adminGql(token, apiVersion, query, variables) {
  const res = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

const token = await resolveAdminToken();
console.log("Store:", domain);
console.log("URLs:", JSON.stringify(urlsReplaceInput, null, 2));

const listQuery = `
  query {
    hydrogenStorefronts(first: 10) {
      edges { node { id title } }
    }
  }
`;

const mutation = `
  mutation SetCustomerUrls($storefrontId: ID!, $input: HydrogenStorefrontCustomerApplicationUrlsReplaceInput!) {
    hydrogenStorefrontCustomerApplicationUrlsReplace(storefrontId: $storefrontId, urlsReplaceInput: $input) {
      userErrors { field message }
    }
  }
`;

for (const version of ["unstable", "2025-01", "2024-10"]) {
  console.log(`\n--- API ${version} ---`);
  const list = await adminGql(token, version, listQuery);
  if (list.errors) {
    console.log("List storefronts:", list.errors.map((e) => e.message).join("; "));
  } else {
    console.log("Storefronts:", JSON.stringify(list.data?.hydrogenStorefronts?.edges ?? [], null, 2));
  }

  const gids = [
    `gid://shopify/HydrogenStorefront/${storefrontNumericId}`,
    `gid://shopify/HeadlessStorefront/${storefrontNumericId}`,
    ...(list.data?.hydrogenStorefronts?.edges?.map((e) => e.node.id) ?? []),
  ];

  for (const gid of [...new Set(gids)]) {
    const result = await adminGql(token, version, mutation, {
      storefrontId: gid,
      input: urlsReplaceInput,
    });
    const errs = result.errors || result.data?.hydrogenStorefrontCustomerApplicationUrlsReplace?.userErrors;
    if (!errs?.length) {
      console.log(`✓ Success with ${gid} on ${version}`);
      console.log(JSON.stringify(result.data, null, 2));
      process.exit(0);
    }
    console.log(`${gid}:`, (errs || []).map((e) => e.message || JSON.stringify(e)).join("; "));
  }
}

console.error("\n❌ Automatic URL setup failed — Admin token needs Hydrogen/Headless scopes or OAuth install.");
process.exit(1);
