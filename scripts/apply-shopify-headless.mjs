/**
 * Apply Shopify headless migration.
 * Run: node --env-file=.env scripts/apply-shopify-headless.mjs
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
  join(root, "supabase", "migrations", "20260717100000_shopify_headless.sql"),
  "utf8",
);

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log(`Connected to ${projectRef}`);
await client.query(sql);
console.log("Applied: 20260717100000_shopify_headless.sql");
await client.end();
