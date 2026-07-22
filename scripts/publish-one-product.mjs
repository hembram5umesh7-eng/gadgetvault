/**
 * Publish one product to Headless — only needs write_publications (not read_products).
 * Run: npm run shopify:publish-one -- gid://shopify/Product/10490328777019
 */
import { resolveAdminToken } from "./shopify-admin-auth.mjs";

const domain = (process.env.VITE_SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const token = await resolveAdminToken();
const productGid = process.argv[2];
const publicationId =
  process.env.SHOPIFY_HEADLESS_PUBLICATION_ID?.trim() || "gid://shopify/Publication/290413740347";

if (!domain || !productGid) {
  console.error("Usage: node scripts/publish-one-product.mjs gid://shopify/Product/ID");
  process.exit(1);
}

const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
  body: JSON.stringify({
    query: `mutation($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        userErrors { message }
      }
    }`,
    variables: { id: productGid, input: [{ publicationId }] },
  }),
});

const json = await res.json();
if (json.errors?.length) {
  const msg = json.errors[0].message;
  console.error("❌", msg);
  if (/write_publications|access denied/i.test(msg)) {
    console.error("\nDev app mein write_publications scope add karo + naya Admin token .env mein daalo.");
  }
  process.exit(1);
}

const errs = json.data?.publishablePublish?.userErrors ?? [];
if (errs.some((e) => /already published/i.test(e.message))) {
  console.log("✓ Already published to Headless");
} else if (errs.length) {
  console.error("❌", errs.map((e) => e.message).join("; "));
  process.exit(1);
} else {
  console.log("✓ Published to Headless (gadgetvault)");
  console.log("Refresh: http://localhost:8080/category/kitchen-accessories");
}
