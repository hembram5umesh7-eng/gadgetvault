const domain = "gharstoreessential.myshopify.com";
const id = process.env.SHOPIFY_CLIENT_ID;
const secret = process.env.SHOPIFY_CLIENT_SECRET;

const oauth = await fetch(`https://${domain}/admin/oauth/access_token`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
});
const { access_token } = await oauth.json();

const queries = [
  ["currentAppInstallation", "query { currentAppInstallation { accessScopes { handle } app { title } } }"],
  ["app", "query { app { title installation { accessScopes { handle } } } }"],
];

for (const [name, q] of queries) {
  const r = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": access_token },
    body: JSON.stringify({ query: q }),
  });
  const j = await r.json();
  console.log("\n" + name + ":", JSON.stringify(j.data ?? j.errors, null, 2));
}
