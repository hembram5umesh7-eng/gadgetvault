/**
 * Backfill variant_image + color_hex from CJ for existing products.
 * Run: node --env-file=.env scripts/backfill-variant-colors.mjs
 */
import pg from "pg";

const COLOR_HEX = {
  black: "#1a1a1a", white: "#f5f5f5", gray: "#9ca3af", grey: "#9ca3af",
  silver: "#c0c0c0", gold: "#d4af37", red: "#dc2626", blue: "#2563eb",
  green: "#16a34a", yellow: "#eab308", orange: "#ea580c", pink: "#ec4899",
  purple: "#9333ea", brown: "#78350f", beige: "#d6c6a8",
};

function colorNameToHex(name) {
  const key = String(name).trim().toLowerCase();
  if (COLOR_HEX[key]) return COLOR_HEX[key];
  for (const [k, hex] of Object.entries(COLOR_HEX)) {
    if (key.includes(k)) return hex;
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 55%, 45%)`;
}

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

async function cjToken() {
  const refresh = process.env.CJ_REFRESH_TOKEN?.trim();
  if (refresh) {
    const r = await fetch(`${CJ_BASE}/authentication/refreshAccessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    const b = await r.json();
    if (b.code === 200 || b.result) return b.data.accessToken;
  }
  const r = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: process.env.CJ_API_KEY }),
  });
  const b = await r.json();
  if (b.code !== 200 && !b.result) throw new Error(b.message || "CJ auth failed");
  return b.data.accessToken;
}

const pool = new pg.Pool({
  connectionString: `postgresql://postgres:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@db.zpvkbwovurryqqqvdxzb.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

// Ensure column exists
await pool.query(`alter table public.product_variants add column if not exists variant_image text`);

const token = await cjToken();
const { rows: products } = await pool.query(`
  select id, name, cj_product_id from products where fulfillment_source = 'cj' and cj_product_id is not null
`);

console.log(`Backfilling ${products.length} CJ product(s)...`);

for (const p of products) {
  try {
    await new Promise((r) => setTimeout(r, 1100));
    const res = await fetch(
      `${CJ_BASE}/product/query?pid=${encodeURIComponent(p.cj_product_id)}&features=enable_description`,
      { headers: { "CJ-Access-Token": token } },
    );
    const body = await res.json();
    if (body.code !== 200 && body.result !== true) {
      console.log(`  ✗ ${p.name}: ${body.message ?? "CJ API error"}`);
      continue;
    }
    const variants = body.data?.variants ?? [];
    if (!variants.length) {
      console.log(`  skip ${p.name}: no CJ variants`);
      continue;
    }

    const { rows: local } = await pool.query(
      `select id, color, cj_variant_id from product_variants where product_id = $1`,
      [p.id],
    );
    const byVid = new Map(variants.map((v) => [String(v.vid), v]));
    const byColor = new Map(variants.map((v) => [String(v.variantKey ?? "").trim(), v]));

    for (const lv of local) {
      const cj = (lv.cj_variant_id && byVid.get(lv.cj_variant_id)) || byColor.get(lv.color);
      if (!cj) continue;
      const color = String(cj.variantKey ?? lv.color).trim() || lv.color;
      await pool.query(
        `update product_variants set color_hex = $1, variant_image = $2, color = $3 where id = $4`,
        [colorNameToHex(color), cj.variantImage || null, color, lv.id],
      );
    }

    const allImages = [...new Set(variants.map((v) => v.variantImage).filter(Boolean))];
    if (allImages.length) {
      const { rows: prod } = await pool.query(`select images from products where id = $1`, [p.id]);
      const merged = [...new Set([...allImages, ...(prod[0]?.images ?? [])])].slice(0, 12);
      await pool.query(`update products set images = $1 where id = $2`, [merged, p.id]);
    }

    console.log(`  ✓ ${p.name} (${variants.length} variants)`);
  } catch (err) {
    console.log(`  ✗ ${p.name}: ${err instanceof Error ? err.message : err}`);
  }
}

await pool.end();
console.log("Done.");
