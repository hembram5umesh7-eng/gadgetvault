/**
 * Save Admin API token + run full sync (products → Headless + pending orders).
 * Usage: node --env-file=.env scripts/shopify-full-sync.mjs [shpat_token]
 */
import { resolveAdminToken } from "./shopify-admin-auth.mjs";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const domain = (process.env.VITE_SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const tokenArg = process.argv[2]?.trim();

async function saveToken(token) {
  if (!url || !key) return;
  const current = await fetch(`${url}/rest/v1/app_settings?key=eq.shopify_admin&select=value`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  }).then((r) => r.json());
  const merged = {
    ...(current[0]?.value ?? {}),
    access_token: token,
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await fetch(`${url}/rest/v1/app_settings`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ key: "shopify_admin", value: merged, updated_at: new Date().toISOString() }),
  });
  console.log("Saved token to Supabase");
}

async function adminQuery(token, query, variables) {
  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data;
}

async function verifyToken(token) {
  const data = await adminQuery(token, "query { products(first: 1) { edges { node { id } } } }");
  return Boolean(data?.products?.edges?.length >= 0);
}

async function publishAll(token) {
  const pubId =
    process.env.SHOPIFY_HEADLESS_PUBLICATION_ID ||
    (await adminQuery(
      token,
      `query { publications(first: 20) { edges { node { id name } } } }`,
    )).publications.edges.find((e) => /headless|gadgetvault/i.test(e.node.name))?.node.id;

  if (!pubId) throw new Error("Headless publication not found");

  const products = await adminQuery(
    token,
    `query { products(first: 250) { edges { node { id title } } } }`,
  );
  let published = 0;
  for (const { node } of products.products.edges) {
    await adminQuery(
      token,
      `mutation($id: ID!, $pub: ID!) {
        publishablePublish(id: $id, input: [{ publicationId: $pub }]) {
          userErrors { message }
        }
      }`,
      { id: node.id, pub: pubId },
    );
    published++;
  }
  return { published, pubId };
}

if (tokenArg?.startsWith("shpat_")) {
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = tokenArg;
  await saveToken(tokenArg);
}

const token = await resolveAdminToken();
console.log("Token:", token.slice(0, 14) + "...");

const install = await adminQuery(
  token,
  "query { currentAppInstallation { accessScopes { handle } app { title } } }",
);
const scopes = install.currentAppInstallation?.accessScopes?.map((s) => s.handle) ?? [];
console.log("Installation scopes:", scopes.length ? scopes.join(", ") : "(empty)");

try {
  await verifyToken(token);
  console.log("✓ products API OK");
} catch (err) {
  console.error("\n❌ Token has no product access:", err.message);
  console.error("\nApp install hai lekin scopes grant nahi hue.");
  console.error("Fix (2 min):");
  console.error("  1. Dev Dashboard → Versions → Create version");
  console.error("     Redirect URL paste karo: http://localhost:8080/api/shopify/auth/callback");
  console.error("  2. npm run dev");
  console.error("  3. http://localhost:8080/admin/shopify → Connect Shopify → Allow");
  console.error("\n  YA Admin API token paste: node --env-file=.env scripts/shopify-full-sync.mjs shpat_XXXX");
  process.exit(1);
}

console.log("\nPublishing products to Headless...");
const pub = await publishAll(token);
console.log(`✓ Published ${pub.published} products to ${pub.pubId}`);

console.log("\nDone — ab admin panel se pending orders sync ho jayenge.");
