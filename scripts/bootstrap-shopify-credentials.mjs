/** One-time bootstrap: save automation token + env client secret to Supabase */
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const automation = process.argv[2];
const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const value = {
  automation_token: automation?.startsWith("atkn_") ? automation : null,
  client_secret: clientSecret?.startsWith("shpss_") ? clientSecret : null,
  updated_at: new Date().toISOString(),
};

const res = await fetch(`${url}/rest/v1/app_settings`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates",
  },
  body: JSON.stringify({ key: "shopify_admin", value, updated_at: new Date().toISOString() }),
});

console.log("Save status:", res.status, await res.text());
console.log("Saved automation token:", Boolean(value.automation_token));
console.log("Saved client secret:", Boolean(value.client_secret));
