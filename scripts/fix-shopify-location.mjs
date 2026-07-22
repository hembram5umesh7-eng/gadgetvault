/**
 * Check / create Shopify inventory location (fixes Wukusy "No Shopify location found").
 * Run: node --env-file=.env scripts/fix-shopify-location.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = join(__dirname, "..", ".env");
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
}

loadEnv();

const domain = (process.env.VITE_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN || "")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();

if (!domain || !token) {
  console.error("Missing VITE_SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN in .env");
  process.exit(1);
}

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
    if (/access denied|read_locations/i.test(msg)) {
      console.log("API token missing read_locations scope.\n");
      console.log("Manual fix in Shopify Admin:");
      console.log("  1. Settings → Locations → Add location");
      console.log("     Name: GHAR STORE Warehouse");
      console.log("     Country: India · Enable 'Fulfill online orders'");
      console.log("  2. Settings → Apps → Wukusy → Disconnect & reconnect");
      console.log("  3. Wukusy → Push To Shopify again");
      console.log("\nOptional: Add read_locations + write_locations to your Admin app scopes,");
      console.log("regenerate token, update SHOPIFY_ADMIN_ACCESS_TOKEN in .env, re-run this script.");
      process.exit(0);
    }
    throw new Error(msg);
  }
  return json.data;
}

console.log(`Store: ${domain}\n`);

const listData = await adminQuery(
  `query {
    locations(first: 20) {
      edges {
        node {
          id
          name
          isActive
          fulfillsOnlineOrders
          address { address1 city province countryCode zip }
        }
      }
    }
  }`,
);

const locations = listData.locations.edges.map((e) => e.node);
console.log(`Found ${locations.length} location(s):`);
for (const loc of locations) {
  console.log(`  - ${loc.name} | active=${loc.isActive} | fulfillsOnline=${loc.fulfillsOnlineOrders}`);
  if (loc.address?.city) console.log(`    ${loc.address.address1}, ${loc.address.city}`);
}

if (locations.some((l) => l.isActive && l.fulfillsOnlineOrders)) {
  console.log("\n✓ Active location exists. Wukusy should work after reconnect:");
  console.log("  1. Shopify Admin → Settings → Apps → Wukusy → Disconnect & reconnect store");
  console.log("  2. Wukusy → Push To Shopify again");
  process.exit(0);
}

console.log("\nNo active fulfilling location — creating default location...");

const createData = await adminQuery(
  `mutation LocationAdd($input: LocationAddInput!) {
    locationAdd(input: $input) {
      location { id name isActive fulfillsOnlineOrders }
      userErrors { field message }
    }
  }`,
  {
    input: {
      name: "GadgetVault Fulfillment",
      fulfillsOnlineOrders: true,
      address: {
        address1: "Warehouse / Dropship Center",
        city: "Mumbai",
        provinceCode: "MH",
        countryCode: "IN",
        zip: "400001",
      },
    },
  },
);

const errs = createData.locationAdd.userErrors;
if (errs?.length) {
  console.error("\nCould not create location via API:");
  for (const e of errs) console.error(`  - ${e.message}`);
  console.log("\nManual fix in Shopify Admin:");
  console.log("  Settings → Locations → Add location");
  console.log("  Name: GadgetVault Fulfillment");
  console.log("  Country: India · Enable 'Fulfill online orders'");
  console.log("  Then reconnect Wukusy app.");
  process.exit(1);
}

const created = createData.locationAdd.location;
console.log(`\n✓ Created location: ${created.name} (${created.id})`);
console.log("Now in Wukusy: Push To Shopify again. If still fails, disconnect & reconnect Wukusy to Shopify.");
