const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const domain = "gharstoreessential.myshopify.com";
const clientId = process.env.SHOPIFY_CLIENT_ID?.trim() || process.env.SHOPIFY_API_KEY?.trim();
const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim() || process.env.SHOPIFY_API_SECRET?.trim();

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!clientId || !clientSecret) {
  console.error("Missing SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET — set in .env");
  process.exit(1);
}

// Save to Supabase
const current = await fetch(`${url}/rest/v1/app_settings?key=eq.shopify_admin&select=value`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
}).then((r) => r.json());

const merged = { ...(current[0]?.value ?? {}), client_secret: clientSecret, updated_at: new Date().toISOString() };

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

console.log("Saved client secret to DB");

// Test OAuth client credentials
const oauth = await fetch(`https://${domain}/admin/oauth/access_token`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  }),
});

const text = await oauth.text();
console.log("\nOAuth status:", oauth.status);

if (!oauth.ok) {
  console.log("OAuth error:", text.slice(0, 300));
  process.exit(1);
}

const { access_token, scope } = JSON.parse(text);
console.log("OAuth scopes field:", scope || "(empty — normal until OAuth install)");
console.log("Token prefix:", access_token.slice(0, 12) + "...");

async function gql(q) {
  const r = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": access_token },
    body: JSON.stringify({ query: q }),
  });
  return r.json();
}

const installCheck = await gql(
  "query { currentAppInstallation { accessScopes { handle } app { title } } }",
);
const installedScopes = installCheck.data?.currentAppInstallation?.accessScopes?.map((s) => s.handle) ?? [];
console.log("Installed scopes on store:", installedScopes.length ? installedScopes.join(", ") : "(none — OAuth install pending)");

const productsCheck = await gql("query { products(first: 1) { edges { node { id title } } } }");
const productsOk = !productsCheck.errors?.some((e) => /access denied/i.test(e.message));

if (!productsOk) {
  merged.access_token = null;
  merged.scope = null;
  merged.connected_at = null;
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
  console.log("\n⚠ App installed hai lekin scopes grant nahi hue.");
  console.log("Version mein scopes add ho chuke — ab sirf OAuth install baaki:");
  console.log("  1. Dev Dashboard → Versions → Create version");
  console.log("     Redirect URL: http://localhost:8080/api/shopify/auth/callback");
  console.log("  2. Release karo");
  console.log("  3. npm run dev → http://localhost:8080/admin/shopify → Connect Shopify");
  process.exit(1);
}

// Save access token when API works (scope field may still be empty string)
merged.access_token = access_token;
merged.scope = scope || installedScopes.join(",");
merged.connected_at = new Date().toISOString();
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
console.log("Saved access token to DB");

// Test scopes
for (const [name, q] of [
  ["products", "query { products(first: 3) { edges { node { id title } } } }"],
  ["publications", "query { publications(first: 5) { edges { node { id name } } } }"],
  ["draftOrders", "query { draftOrders(first: 1) { edges { node { id } } } }"],
]) {
  const j = await gql(q);
  console.log(name + ":", j.errors?.[0]?.message || "OK (" + (j.data?.[Object.keys(j.data)[0]]?.edges?.length ?? "?") + ")");
}
