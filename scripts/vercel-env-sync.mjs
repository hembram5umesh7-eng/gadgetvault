/**
 * Sync required env vars from .env to Vercel (production, preview, development).
 * Usage: node scripts/vercel-env-sync.mjs
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const REQUIRED_VARS = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
  "VITE_SHOPIFY_STORE_DOMAIN",
  "VITE_SHOPIFY_STOREFRONT_TOKEN",
  "VITE_APP_URL",
  "VITE_APP_PUBLIC_URL",
  "SHOPIFY_CLIENT_ID",
  "SHOPIFY_CLIENT_SECRET",
  "SHOPIFY_HEADLESS_PUBLICATION_ID",
  "SHOPIFY_CUSTOMER_ACCOUNT_SHOP_ID",
  "VITE_SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID",
  "SHOPIFY_CUSTOMER_ACCOUNT_AUTHORIZE_URL",
  "SHOPIFY_CUSTOMER_ACCOUNT_TOKEN_URL",
  "SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_URL",
];

/** Set after Razorpay approval — skipped when empty in .env */
const OPTIONAL_VARS = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"];

const VARS = [...REQUIRED_VARS, ...OPTIONAL_VARS];

const map = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const quoted = line.match(/^([A-Z0-9_]+)="(.*)"/);
  const plain = line.match(/^([A-Z0-9_]+)=(.+)$/);
  if (quoted) map[quoted[1]] = quoted[2];
  else if (plain && !line.startsWith("#")) map[plain[1]] = plain[2].trim();
}

for (const name of VARS) {
  const val = map[name];
  if (!val) {
    if (OPTIONAL_VARS.includes(name)) {
      console.log(`Skip optional ${name} (not in .env yet)`);
      continue;
    }
    console.error(`Missing ${name} in .env`);
    process.exitCode = 1;
    continue;
  }
  for (const env of ["production", "preview", "development"]) {
    const r = spawnSync("npx", ["vercel@latest", "env", "add", name, env, "--force"], {
      input: val,
      encoding: "utf8",
      shell: true,
    });
    if (r.status !== 0) {
      console.error(`Failed ${name} (${env}):`, r.stderr || r.stdout);
      process.exitCode = 1;
    } else {
      console.log(`Added ${name} → ${env}`);
    }
  }
}
