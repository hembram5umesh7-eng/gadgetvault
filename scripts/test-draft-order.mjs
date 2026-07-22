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

// Test draft order create with iron variant from storefront
const ironVariant = "gid://shopify/ProductVariant/"; // need real variant id

// Get iron variant from storefront
const sfToken = process.env.VITE_SHOPIFY_STOREFRONT_TOKEN;
const sf = await fetch(`https://${domain}/api/2024-10/graphql.json`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": sfToken },
  body: JSON.stringify({
    query: `query { productByHandle(handle: "cross-border-handheld-folding-clothes-ironing-machine-portable-steam-iron-travel-mini-ironing-clothes-artifact-easy-to-storage") {
      variants(first:1){edges{node{id title}}}
    }}`,
  }),
});
const sfJson = await sf.json();
const variantId = sfJson.data?.productByHandle?.variants?.edges?.[0]?.node?.id;
console.log("Iron variant:", variantId);

const draft = await gql(
  `mutation($input: DraftOrderCreateInput!) {
    draftOrderCreate(input: $input) {
      draftOrder { id status }
      userErrors { message }
    }
  }`,
  {
    input: {
      email: "test@gadgetvault.in",
      lineItems: [{ variantId, quantity: 1 }],
      shippingAddress: {
        firstName: "Test",
        lastName: "User",
        address1: "123 Test St",
        city: "Mumbai",
        province: "Maharashtra",
        zip: "400001",
        country: "India",
      },
    },
  },
);

console.log("Draft order:", JSON.stringify(draft, null, 2).slice(0, 600));
