import pg from "pg";

const pool = new pg.Pool({
  connectionString: `postgresql://postgres:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@db.zpvkbwovurryqqqvdxzb.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

const { rows: orders } = await pool.query(`
  select order_number, id, status, cj_order_id, cj_status, cj_error, payment_method, created_at
  from orders order by created_at desc limit 5
`);
console.log("Orders:", JSON.stringify(orders, null, 2));

const { rows: items } = await pool.query(`
  select oi.order_id, oi.product_name, p.fulfillment_source, p.cj_product_id, pv.cj_variant_id
  from order_items oi
  join products p on p.id = oi.product_id
  left join product_variants pv on pv.id = oi.variant_id
  order by oi.created_at desc limit 5
`);
console.log("Items:", JSON.stringify(items, null, 2));

await pool.end();
