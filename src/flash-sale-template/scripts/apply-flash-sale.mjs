/**
 * Apply flash sale migration to Supabase Postgres.
 * Run from your project root:
 *   node --env-file=.env scripts/apply-flash-sale.mjs
 *
 * Env: SUPABASE_DB_PASSWORD (required), VITE_SUPABASE_PROJECT_ID or SUPABASE_PROJECT_ID
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
  process.env.SUPABASE_PROJECT_REF;

const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!projectRef) {
  console.error("Missing VITE_SUPABASE_PROJECT_ID or SUPABASE_PROJECT_ID in .env");
  process.exit(1);
}
if (!dbPassword) {
  console.error("Missing SUPABASE_DB_PASSWORD in .env");
  process.exit(1);
}

const connectionString =
  process.env.SUPABASE_DB_URL ||
  `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;

const sql = readFileSync(
  join(root, "supabase", "migrations", "20260712120000_flash_sale.sql"),
  "utf8",
);

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log(`Connected to ${projectRef}`);
await client.query(sql);
console.log("Applied: 20260712120000_flash_sale.sql");

const { rows } = await client.query(`
  select
    to_regclass('public.flash_sale_items') as table_name,
    (select value->>'enabled' from public.app_settings where key = 'flash_sale') as flash_enabled
`);
console.log("Verified:", rows[0]);
await client.end();
