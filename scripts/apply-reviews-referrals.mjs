/**
 * Apply reviews + referrals migration.
 * Run: node --env-file=.env scripts/apply-reviews-referrals.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const projectRef =
  process.env.VITE_SUPABASE_PROJECT_ID ||
  process.env.SUPABASE_PROJECT_ID ||
  "zpvkbwovurryqqqvdxzb";
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!dbPassword) {
  console.error("Missing SUPABASE_DB_PASSWORD in .env");
  process.exit(1);
}

const connectionString =
  process.env.SUPABASE_DB_URL ||
  `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;

const sql = readFileSync(
  join(root, "supabase", "migrations", "20260713140000_reviews_referrals.sql"),
  "utf8",
);

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log(`Connected to ${projectRef}`);
await client.query(sql);
console.log("Applied: 20260713140000_reviews_referrals.sql");

const { rows } = await client.query(`
  select
    to_regclass('public.product_reviews') as reviews_table,
    to_regclass('public.referral_codes') as referral_table,
    (select value->>'enabled' from public.app_settings where key = 'referral_settings') as referral_enabled
`);
console.log("Verified:", rows[0]);
await client.end();
