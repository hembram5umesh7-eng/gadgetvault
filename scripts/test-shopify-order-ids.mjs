import { resolveAdminToken } from "./shopify-admin-auth.mjs";

const domain = (process.env.VITE_SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const token = await resolveAdminToken();

for (const id of ["1007", "1006", "7555695935803", "7555567747387"]) {
  const res = await fetch(`https://${domain}/admin/api/2024-10/orders/${id}.json`, {
    headers: { "X-Shopify-Access-Token": token },
  });
  const text = await res.text();
  console.log(`ID ${id}: HTTP ${res.status}`);
  if (res.ok) {
    const j = JSON.parse(text);
    console.log(`  name=${j.order?.name} id=${j.order?.id} cancelled=${j.order?.cancelled_at}`);
  } else {
    console.log(`  ${text.slice(0, 120)}`);
  }
}

// List recent orders
const list = await fetch(`https://${domain}/admin/api/2024-10/orders.json?status=any&limit=5`, {
  headers: { "X-Shopify-Access-Token": token },
});
const orders = (await list.json()).orders ?? [];
console.log("\nRecent orders:");
for (const o of orders) {
  console.log(`  ${o.name} internal_id=${o.id} cancelled=${o.cancelled_at}`);
}
