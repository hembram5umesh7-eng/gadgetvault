import pg from "pg";

const pool = new pg.Pool({
  connectionString: `postgresql://postgres:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@db.zpvkbwovurryqqqvdxzb.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

const { rows } = await pool.query(`
  select p.slug, pv.size, pv.color, pv.color_hex, pv.variant_image, pv.cj_variant_id
  from product_variants pv
  join products p on p.id = pv.product_id
  where p.slug like '%stone-mortar%'
  order by pv.color, pv.size
`);
console.log(JSON.stringify(rows, null, 2));
await pool.end();
