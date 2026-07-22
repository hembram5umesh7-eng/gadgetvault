/**
 * Publish all Shopify products to Headless storefront (gadgetvault).
 * Run: npm run shopify:publish
 */
import { resolveAdminToken } from "./shopify-admin-auth.mjs";

const domain = (process.env.VITE_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN || "")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

if (!domain) {
  console.error("Missing VITE_SHOPIFY_STORE_DOMAIN");
  process.exit(1);
}

const token = await resolveAdminToken();

async function adminQuery(query, variables) {
  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join("; ");
    if (/read_publications|read_products|access denied/i.test(msg)) {
      console.error("\n❌ Admin API scopes missing on your Dev app.");
      console.error("Fix: Shopify Dev Dashboard → your app → Configuration → Admin API scopes:");
      console.error("  ✓ read_products, write_products");
      console.error("  ✓ read_publications, write_publications");
      console.error("Then: Install app on store → Settings → Apps → Develop apps → Install");
      console.error("Release new version if needed, then run: npm run shopify:publish\n");
    }
    throw new Error(msg);
  }
  return json.data;
}

console.log(`Store: ${domain}\n`);

let headlessPub = null;
const pubFromEnv = process.env.SHOPIFY_HEADLESS_PUBLICATION_ID?.trim();

if (pubFromEnv) {
  headlessPub = { id: pubFromEnv, name: "gadgetvault (from .env)" };
  console.log(`Using publication from .env: ${pubFromEnv}\n`);
} else {
  try {
    const pubData = await adminQuery(`query {
      publications(first: 25) {
        edges { node { id name catalog { title } } }
      }
    }`);

    const publications = pubData.publications.edges.map((e) => e.node);
    console.log("Publications:");
    for (const p of publications) console.log(`  - ${p.name} (${p.id})`);

    headlessPub =
      publications.find((p) => /headless|gadgetvault/i.test(p.name)) ??
      publications.find((p) => /headless/i.test(p.catalog?.title ?? ""));
  } catch (err) {
    console.warn("Could not list publications — set SHOPIFY_HEADLESS_PUBLICATION_ID in .env");
    console.warn(String(err));
  }
}

if (!headlessPub) {
  console.error("\nNo Headless publication found.");
  console.error("Quick fix: add to .env:");
  console.error("  SHOPIFY_HEADLESS_PUBLICATION_ID=gid://shopify/Publication/290413740347");
  console.error("Then fix Admin API scopes and rerun: npm run shopify:publish");
  process.exit(1);
}

console.log(`\nUsing publication: ${headlessPub.name}\n`);

// Fetch all product IDs
let cursor = null;
const productIds = [];
for (;;) {
  const data = await adminQuery(
    `query Products($cursor: String) {
      products(first: 50, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        edges { node { id title status } }
      }
    }`,
    { cursor },
  );
  for (const e of data.products.edges) {
    if (e.node.status === "ACTIVE") productIds.push({ id: e.node.id, title: e.node.title });
  }
  if (!data.products.pageInfo.hasNextPage) break;
  cursor = data.products.pageInfo.endCursor;
}

console.log(`Found ${productIds.length} active product(s)\n`);

let published = 0;
let skipped = 0;

for (const { id, title } of productIds) {
  const result = await adminQuery(
    `mutation Publish($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        userErrors { field message }
      }
    }`,
    { id, input: [{ publicationId: headlessPub.id }] },
  );

  const errs = result.publishablePublish.userErrors;
  if (errs?.length) {
    const already = errs.some((e) => /already published/i.test(e.message));
    if (already) {
      skipped++;
      console.log(`  skip (already published): ${title.slice(0, 60)}`);
    } else {
      console.log(`  ✗ ${title.slice(0, 50)}: ${errs.map((e) => e.message).join("; ")}`);
    }
  } else {
    published++;
    console.log(`  ✓ published: ${title.slice(0, 60)}`);
  }
}

console.log(`\nDone. Published: ${published}, already live: ${skipped}, total: ${productIds.length}`);
console.log("Refresh GadgetVault category pages — products should appear now.");
