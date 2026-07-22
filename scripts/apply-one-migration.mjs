/** Apply a single migration file: node --env-file=.env scripts/apply-one-migration.mjs <filename> */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("Usage: apply-one-migration.mjs <migration.sql>");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const projectRef =
  process.env.VITE_SUPABASE_PROJECT_ID ||
  process.env.SUPABASE_PROJECT_ID ||
  "zpvkbwovurryqqqvdxzb";
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
if (!dbPassword) {
  console.error("Missing SUPABASE_DB_PASSWORD");
  process.exit(1);
}

const connectionString =
  process.env.SUPABASE_DB_URL ||
  `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;

const poolerRegion = process.env.SUPABASE_DB_POOLER_REGION || "ap-south-1";
const poolerConnectionString =
  process.env.SUPABASE_DB_POOLER_URL ||
  `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-${poolerRegion}.pooler.supabase.com:6543/postgres`;

async function connectClient() {
  const attempts = [
    { label: "direct", connectionString },
    { label: "pooler", connectionString: poolerConnectionString },
  ];
  let lastError;
  for (const attempt of attempts) {
    const client = new pg.Client({ connectionString: attempt.connectionString, ssl: { rejectUnauthorized: false } });
    try {
      console.log(`Connecting via ${attempt.label}...`);
      await client.connect();
      return client;
    } catch (err) {
      lastError = err;
      console.warn(`${attempt.label} connection failed: ${err instanceof Error ? err.message : err}`);
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  throw lastError ?? new Error("Could not connect to database");
}

const client = await connectClient();
const sql = readFileSync(join(root, "supabase", "migrations", file), "utf8");
console.log(`Applying ${file}...`);

if (file.includes("sub_admin_product_push")) {
  await client.query(`alter type public.app_role add value if not exists 'sub_admin';`);
  const bodySql = sql
    .replace(/^--[^\n]*\n/gm, "")
    .replace(/alter type public\.app_role add value if not exists 'sub_admin';?\s*/i, "")
    .trim();
  await client.query(bodySql);
} else {
  await client.query(sql);
}
console.log("Done.");
await client.end();
