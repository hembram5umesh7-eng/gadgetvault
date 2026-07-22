const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const domain = "gharstoreessential.myshopify.com";

const settings = await fetch(`${url}/rest/v1/app_settings?key=eq.shopify_admin&select=value`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
}).then((r) => r.json());

const clientSecret = settings[0]?.value?.client_secret || process.env.SHOPIFY_CLIENT_SECRET;
const clientId = process.env.SHOPIFY_CLIENT_ID;

console.log("client id:", clientId?.slice(0, 8));
console.log("secret from db:", Boolean(settings[0]?.value?.client_secret));

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
console.log("OAuth:", oauth.status, text.slice(0, 400));

if (oauth.ok) {
  const { access_token, scope } = JSON.parse(text);
  console.log("scopes:", scope);
  const g = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": access_token },
    body: JSON.stringify({ query: "query { products(first: 2) { edges { node { title } } } }" }),
  });
  const j = await g.json();
  console.log("products:", j.errors?.[0]?.message || j.data?.products?.edges?.map((e) => e.node.title));
}
