const SHOP = "gharstoreessential.myshopify.com";
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  }),
});

const text = await r.text();
console.log("OAuth status:", r.status, text.slice(0, 300));

if (!r.ok) process.exit(1);

const { access_token } = JSON.parse(text);
console.log("Got token, scopes test...");

const g = await fetch(`https://${SHOP}/admin/api/2024-10/graphql.json`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": access_token,
  },
  body: JSON.stringify({
    query: `{ products(first:10){ edges { node { id title } } } publications(first:10){ edges { node { id name } } } }`,
  }),
});

console.log(JSON.stringify(await g.json(), null, 2));
