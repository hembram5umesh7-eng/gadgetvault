/**
 * Register all supplier warehouse addresses as Shiprocket pickup locations.
 * Usage: node --env-file=.env scripts/sync-shiprocket-pickups.mjs
 */
import pg from "pg";

const BASE = "https://apiv2.shiprocket.in";

async function shiprocketLogin() {
  const email = process.env.SHIPROCKET_API_EMAIL;
  const password = process.env.SHIPROCKET_API_PASSWORD;
  if (!email || !password) throw new Error("Missing SHIPROCKET_API_EMAIL / SHIPROCKET_API_PASSWORD in .env");

  const res = await fetch(`${BASE}/v1/external/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error(data.message || "Shiprocket login failed");
  return data.token;
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits.padStart(10, "0").slice(-10);
}

function defaultPickupName(name) {
  return name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "Supplier";
}

async function addPickup(token, supplier) {
  const pickupName = supplier.shiprocket_pickup_name?.trim() || defaultPickupName(supplier.name);
  const res = await fetch(`${BASE}/v1/external/settings/company/addpickup`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pickup_location: pickupName,
      name: supplier.name.slice(0, 80),
      email: supplier.contact_email,
      phone: normalizePhone(supplier.contact_phone),
      address: supplier.address.slice(0, 80),
      address_2: "",
      city: supplier.city,
      state: supplier.state,
      country: "India",
      pin_code: supplier.pincode,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok && !/already|exist|duplicate/i.test(body.message || "")) {
    throw new Error(body.message || `addpickup failed ${res.status}`);
  }
  return pickupName;
}

async function main() {
  const projectRef = process.env.VITE_SUPABASE_PROJECT_ID || "oceuhhvbqyqqpmukljgm";
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) throw new Error("Missing SUPABASE_DB_PASSWORD in .env");

  const client = new pg.Client({
    connectionString:
      process.env.SUPABASE_DB_URL ||
      `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows } = await client.query(`
    select id, name, contact_email, contact_phone, address, city, state, pincode, shiprocket_pickup_name
    from public.manufacturers
    where active = true
  `);

  if (!rows.length) {
    console.log("No active suppliers found.");
    await client.end();
    return;
  }

  const token = await shiprocketLogin();
  for (const supplier of rows) {
    if (!supplier.address || !supplier.city || !supplier.state || !supplier.pincode) {
      console.warn(`SKIP ${supplier.name}: missing city/state/pincode — fill in Admin → Suppliers`);
      continue;
    }
    if (!supplier.contact_email || !supplier.contact_phone) {
      console.warn(`SKIP ${supplier.name}: missing email/phone`);
      continue;
    }
    const pickupName = await addPickup(token, supplier);
    await client.query(
      `update public.manufacturers set shiprocket_pickup_name = $1 where id = $2`,
      [pickupName, supplier.id],
    );
    console.log(`OK ${supplier.name} → Shiprocket pickup "${pickupName}"`);
    console.log(`   ${supplier.address}, ${supplier.city}, ${supplier.state} - ${supplier.pincode}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
