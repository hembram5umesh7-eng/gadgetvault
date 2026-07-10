/**
 * Sync required env vars from .env to Vercel (production, preview, development).
 * Usage: node scripts/vercel-env-sync.mjs
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const VARS = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
  "CJ_API_KEY",
  "CJ_REFRESH_TOKEN",
  "CJ_USD_INR",
  "CJ_MARKUP_PERCENT",
  "CJ_PAY_TYPE",
  "CJ_LOGISTIC_NAME",
];

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
