/**
 * Confirm email + ensure profile/role for a customer account.
 * Run: node --env-file=.env scripts/repair-customer.mjs hembram5umesh7@gmail.com
 */
import pg from "pg";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const emailArg = process.argv[2];

if (!url || !serviceKey || !dbPassword) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_DB_PASSWORD in .env");
  process.exit(1);
}
if (!emailArg) {
  console.error("Usage: node --env-file=.env scripts/repair-customer.mjs <email>");
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const authHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function authFetch(path, options = {}) {
  const res = await fetch(`${url}${path}`, {
    ...options,
    headers: { ...authHeaders, ...(options.headers ?? {}) },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) throw new Error(`${options.method ?? "GET"} ${path} [${res.status}]: ${text}`);
  return body;
}

async function findUser() {
  let page = 1;
  while (page <= 10) {
    const data = await authFetch(`/auth/v1/admin/users?page=${page}&per_page=200`);
    const hit = (data.users ?? []).find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if ((data.users ?? []).length < 200) break;
    page++;
  }
  return null;
}

const user = await findUser();
if (!user) {
  console.error(`No user found for ${email}`);
  process.exit(1);
}

console.log(`Found user ${user.id} — email_confirmed: ${user.email_confirmed_at ? "yes" : "no"}`);

await authFetch(`/auth/v1/admin/users/${user.id}`, {
  method: "PUT",
  body: JSON.stringify({
    email_confirm: true,
    user_metadata: { ...user.user_metadata, full_name: user.user_metadata?.full_name ?? "Customer" },
  }),
});
console.log("Email confirmed");

const pool = new pg.Pool({
  connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.zpvkbwovurryqqqvdxzb.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

const fullName = user.user_metadata?.full_name ?? "Customer";
await pool.query(
  `insert into public.profiles (id, full_name) values ($1, $2) on conflict (id) do update set full_name = excluded.full_name`,
  [user.id, fullName],
);
await pool.query(
  `insert into public.user_roles (user_id, role) select $1, 'user' where not exists (select 1 from public.user_roles where user_id = $1 and role = 'user')`,
  [user.id],
);
await pool.end();

console.log(`Repaired ${email} — sign in should work now.`);
