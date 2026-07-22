import { resolveAdminToken } from "./shopify-admin-auth.mjs";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const orders = await fetch(`${url}/rest/v1/orders?order_number=eq.TF100011&select=*`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
}).then((r) => r.json());

const o = orders[0];
const items = await fetch(`${url}/rest/v1/order_items?order_id=eq.${o.id}&select=*`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
}).then((r) => r.json());

const user = await fetch(`${url}/auth/v1/admin/users/${o.user_id}`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
}).then((r) => r.json());

console.log("order", o.order_number, "user email", user?.email, "phone", o.ship_phone);
console.log("items", items.length, items.map((i) => ({ name: i.product_name, variant: i.shopify_variant_id })));
