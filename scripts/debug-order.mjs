const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const orderId = process.argv[2] || "b7ea2f4d-2e96-4054-95cb-57a92c16f94f";

async function sbGet(table, query) {
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return res.json();
}

const orders = await sbGet("orders", `id=eq.${orderId}&select=*`);
const items = await sbGet("order_items", `order_id=eq.${orderId}&select=*`);

console.log("order:", orders[0] ? {
  id: orders[0].id,
  order_number: orders[0].order_number,
  total: orders[0].total,
  user_id: orders[0].user_id,
  shopify_order_id: orders[0].shopify_order_id,
  shopify_draft_order_id: orders[0].shopify_draft_order_id,
} : "NOT FOUND");
console.log("items count:", items.length);
items.forEach((it) => console.log("-", it.product_name, "qty", it.quantity, "variant", it.shopify_variant_id));
