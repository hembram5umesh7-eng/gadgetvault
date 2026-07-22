/**
 * Apply sub-admin migration + sync user_roles from auth app_metadata.
 * Run: node --env-file=.env scripts/setup-subadmin-db.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import ws from "ws";
import { createClient } from "@supabase/supabase-js";

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

function buildConnectionCandidates() {
  const enc = encodeURIComponent(dbPassword);
  const out = [];
  if (process.env.SUPABASE_DB_URL) out.push({ label: "SUPABASE_DB_URL", cs: process.env.SUPABASE_DB_URL });

  out.push({
    label: "direct-host",
    cs: `postgresql://postgres:${enc}@db.${projectRef}.supabase.co:5432/postgres`,
  });

  const region = process.env.SUPABASE_DB_POOLER_REGION || "ap-south-1";
  out.push({
    label: `pooler-session-${region}`,
    cs: `postgresql://postgres.${projectRef}:${enc}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
  });
  out.push({
    label: `pooler-tx-${region}`,
    cs: `postgresql://postgres.${projectRef}:${enc}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
  });

  for (const region of ["us-east-1", "eu-west-1", "ap-southeast-1"]) {
    out.push({
      label: `pooler-session-${region}`,
      cs: `postgresql://postgres.${projectRef}:${enc}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
    });
  }

  return out;
}

async function connectPg() {
  let lastErr;
  for (const { label, cs } of buildConnectionCandidates()) {
    const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
    try {
      console.log(`Trying ${label}...`);
      await client.connect();
      console.log(`Connected via ${label}`);
      return client;
    } catch (err) {
      lastErr = err;
      console.warn(`  failed: ${err instanceof Error ? err.message : err}`);
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  throw lastErr ?? new Error("Could not connect to Postgres");
}

async function syncSubAdminRoles(client) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("Skip auth sync — missing SUPABASE_URL or service key");
    return;
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch },
    realtime: { transport: ws },
  });

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 500 });
  if (error) throw error;

  let synced = 0;
  for (const u of data.users) {
    const roles = u.app_metadata?.roles;
    if (!Array.isArray(roles) || !roles.includes("sub_admin")) continue;
    await client.query(
      `insert into public.user_roles (user_id, role)
       values ($1, 'sub_admin'::public.app_role)
       on conflict (user_id, role) do nothing`,
      [u.id],
    );
    synced += 1;
    console.log(`  synced sub_admin role: ${u.email ?? u.id}`);
  }
  console.log(`Synced ${synced} sub-admin role(s) into user_roles`);
}

async function main() {
  const migrationPath = join(root, "supabase", "migrations", "20260721100000_sub_admin_product_push.sql");
  const fullSql = readFileSync(migrationPath, "utf8");

  const client = await connectPg();

  try {
    console.log("Step 1: add sub_admin enum value...");
    await client.query(`alter type public.app_role add value if not exists 'sub_admin';`);

    const bodySql = fullSql
      .replace(/^--[^\n]*\n/gm, "")
      .replace(/alter type public\.app_role add value if not exists 'sub_admin';?\s*/i, "")
      .trim();

    console.log("Step 2: apply tables, functions, policies...");
    await client.query(bodySql);
    console.log("Migration applied.");

    const { rows } = await client.query(
      `select to_regclass('public.product_push_log') as tbl, exists(
         select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid
         where t.typname = 'app_role' and e.enumlabel = 'sub_admin'
       ) as has_enum`,
    );
    console.log("Verify:", rows[0]);

    await syncSubAdminRoles(client);

    console.log("Reloading PostgREST schema cache...");
    await client.query(`NOTIFY pgrst, 'reload schema'`);
  } finally {
    await client.end();
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch },
    realtime: { transport: ws },
  });
  const { error: tblErr } = await admin.from("product_push_log").select("id").limit(1);
  console.log("REST product_push_log:", tblErr ? tblErr.message : "OK");
}

main().catch((err) => {
  console.error("Setup failed:", err.message ?? err);
  process.exit(1);
});
