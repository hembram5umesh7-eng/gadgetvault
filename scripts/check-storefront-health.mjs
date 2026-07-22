/**
 * Storefront health check — shows products visible on Headless (gadgetvault) channel.
 * Run: npm run shopify:health
 */
const domain = process.env.VITE_SHOPIFY_STORE_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
const token = process.env.VITE_SHOPIFY_STOREFRONT_TOKEN;

if (!domain || !token) {
  console.error("Missing VITE_SHOPIFY_STORE_DOMAIN or VITE_SHOPIFY_STOREFRONT_TOKEN");
  process.exit(1);
}

const PRODUCT_FRAGMENT = `
  title handle productType tags
  collections(first: 3) { edges { node { handle title } } }
`;

async function storefront(query, variables) {
  const res = await fetch(`https://${domain}/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

const NAV = [
  { slug: "kitchen-accessories", keywords: ["kitchen", "cupboard", "organizer", "drawer", "pegboard", "tool set"] },
  { slug: "unique-gadgets", keywords: ["gadget", "iron", "portable", "folding", "cross-border"] },
  { slug: "necessities", keywords: ["slipper", "sandal", "essential", "necessit"] },
];

function inferCategory(node) {
  const hay = `${node.title} ${node.productType ?? ""} ${(node.tags ?? []).join(" ")}`.toLowerCase();
  for (const c of NAV) {
    if (c.keywords.some((k) => hay.includes(k))) return c.slug;
  }
  for (const e of node.collections?.edges ?? []) {
    const h = e.node.handle.toLowerCase();
    if (h.includes("kitchen")) return "kitchen-accessories";
    if (h.includes("unique") || h.includes("gadget")) return "unique-gadgets";
    if (h.includes("necessit") || h.includes("essential")) return "necessities";
  }
  return "unique-gadgets";
}

const data = await storefront(`query { products(first: 250) { edges { node { ${PRODUCT_FRAGMENT} } } } }`);
const products = data.data?.products?.edges?.map((e) => e.node) ?? [];

console.log(`\nHeadless storefront (${domain}): ${products.length} product(s)\n`);

const counts = Object.fromEntries(NAV.map((c) => [c.slug, 0]));
for (const p of products) {
  counts[inferCategory(p)]++;
  console.log(`• ${p.title.slice(0, 70)}`);
  console.log(`  handle: ${p.handle} → ${inferCategory(p)}\n`);
}

console.log("Category counts:");
for (const c of NAV) {
  const n = counts[c.slug];
  const flag = c.slug === "kitchen-accessories" && n === 0 ? " ⚠ MISSING" : "";
  console.log(`  ${c.slug}: ${n}${flag}`);
}

if (counts["kitchen-accessories"] === 0) {
  console.log("\n❌ Kitchen products Shopify Admin mein hain lekin Headless channel par publish nahi.");
  console.log("Fix (manual — abhi ke liye):");
  console.log("  1. Shopify Admin → Products → Kitchen product kholo");
  console.log("  2. Publishing → Headless / gadgetvault ✓ check karo → Save");
  console.log("Fix (auto — scopes ke baad): npm run shopify:publish");
  console.log("  Admin app scopes: read_products, write_products, read_publications, write_publications");
}
