/**
 * Remove all store products, orders, and demo catalog data.
 * Keeps: categories, coupons, users, admin accounts.
 * Run: node --env-file=.env scripts/purge-store-data.mjs
 */
import pg from "pg";
import { readFileSync } from "fs";

const dbPassword = process.env.SUPABASE_DB_PASSWORD;
if (!dbPassword) {
  console.error("Missing SUPABASE_DB_PASSWORD");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.zpvkbwovurryqqqvdxzb.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

const sql = `
  delete from public.order_items;
  delete from public.orders;
  delete from public.coupon_products;
  delete from public.product_variants;
  delete from public.products;
`;

await pool.query(sql);
console.log("Purged: products, variants, orders, order_items, coupon_products");

// Verify
const { rows } = await pool.query("select (select count(*) from products) as products, (select count(*) from orders) as orders");
console.log("Remaining:", rows[0]);
await pool.end();

console.log("Done — import fresh products from CJ Import.");
