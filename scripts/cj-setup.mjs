/**
 * Test CJ API connection only (no demo product import).
 * Run: node --env-file=.env scripts/cj-setup.mjs
 * Import products via Admin → CJ Import in the app.
 */
import pg from "pg";

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const apiKey = process.env.CJ_API_KEY;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const projectRef = process.env.VITE_SUPABASE_PROJECT_ID || "zpvkbwovurryqqqvdxzb";

if (!apiKey) {
  console.error("Missing CJ_API_KEY in .env");
  process.exit(1);
}

async function getToken() {
  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const body = await res.json();
  if (body.code !== 200 && !body.success) throw new Error(body.message || "CJ auth failed");
  return body.data;
}

async function cjGet(token, path) {
  const res = await fetch(`${CJ_BASE}${path}`, { headers: { "CJ-Access-Token": token } });
  const body = await res.json();
  if (body.code !== 200 && body.success !== true && body.result !== true) {
    throw new Error(body.message || `CJ GET ${path} failed`);
  }
  return body.data;
}

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 72);
}

function priceInr(usd, markup = 45) {
  const rate = Number(process.env.CJ_USD_INR ?? 85);
  return Math.ceil(usd * rate * (1 + markup / 100));
}

function flattenListV2(data) {
  const out = [];
  for (const block of data.content ?? []) {
    for (const p of block.productList ?? []) {
      const pid = String(p.id ?? "");
      if (!pid) continue;
      out.push({
        pid,
        name: String(p.nameEn ?? "CJ Product"),
        sku: String(p.sku ?? ""),
        usd: Number(p.sellPrice ?? 0),
        image: String(p.bigImage ?? ""),
      });
    }
  }
  return out;
}

async function importProduct(client, token, pid, category) {
  const detail = await cjGet(token, `/product/query?pid=${encodeURIComponent(pid)}&features=enable_description`);
  const variants = detail.variants ?? [];
  if (!variants.length) throw new Error("no variants");

  const v0 = variants[0];
  const slugBase = slugify(detail.productNameEn ?? detail.nameEn ?? "cj-product");
  let slug = slugBase;
  let n = 1;
  while (true) {
    const { rows } = await client.query("select id from products where slug = $1", [slug]);
    if (!rows.length) break;
    slug = `${slugBase}-${n++}`;
  }

  const images = [v0.variantImage, ...(detail.productImageSet ?? detail.bigImage ? [detail.bigImage] : [])].filter(Boolean).slice(0, 6);
  const basePrice = priceInr(Number(v0.variantSellPrice ?? detail.sellPrice ?? 0));

  const { rows: inserted } = await client.query(
    `insert into products (name, slug, category, description, base_price, specs, brand, warranty_months, is_bestseller, is_deal, images, active, cj_product_id, cj_sku, cj_cost_usd, fulfillment_source)
     values ($1,$2,$3,$4,$5,$6,$7,6,false,false,$8,true,$9,$10,$11,'cj')
     returning id`,
    [
      detail.productNameEn ?? detail.nameEn,
      slug,
      category,
      String(detail.description ?? "").slice(0, 2000) || "Imported from CJ Dropshipping",
      basePrice,
      `CJ SKU: ${detail.productSku ?? detail.sku} · Auto-fulfill`,
      "CJ Dropshipping",
      images,
      detail.pid,
      detail.productSku ?? detail.sku,
      Number(v0.variantSellPrice ?? detail.sellPrice ?? 0),
    ],
  );

  const productId = inserted[0].id;
  for (const v of variants.slice(0, 6)) {
    const key = String(v.variantKey ?? "Standard");
    const parts = key.split("-");
    const color = parts[0] || "Default";
    const size = parts.slice(1).join("-") || "Standard";
    const stock = Math.min(99, Number(v.inventories?.[0]?.totalInventory ?? 50));
    await client.query(
      `insert into product_variants (product_id, size, color, color_hex, stock, cj_variant_id) values ($1,$2,$3,'#111111',$4,$5)`,
      [productId, size, color, stock, v.vid],
    );
  }
  return { name: detail.productNameEn ?? detail.nameEn, slug, price: basePrice };
}

async function main() {
  console.log("1) CJ API auth…");
  const auth = await getToken();
  console.log(`   ✓ Connected (openId: ${auth.openId})`);
  if (auth.refreshToken) {
    console.log(`   Tip: save CJ_REFRESH_TOKEN=${auth.refreshToken.slice(0, 12)}… in .env for long auth`);
  }

  console.log("\n2) Search CJ catalog (test)…");
  const list = await cjGet(auth.accessToken, "/product/listV2?page=1&size=3&keyWord=kitchen&features=enable_category");
  const products = flattenListV2(list);
  console.log(`   ✓ CJ API OK — ${products.length} sample products found`);
  if (products[0]) {
    console.log(`   Example: ${products[0].name} ($${products[0].usd})`);
  }

  if (!dbPassword) {
    console.log("\nDone (auth OK). Add SUPABASE_DB_PASSWORD for DB scripts.");
    return;
  }

  const client = new pg.Client({
    connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows: cnt } = await client.query("select count(*)::int as n from products");
  console.log(`\n3) Store has ${cnt[0].n} products. Import via Admin → CJ Import.`);
  await client.end();
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
