/**
 * Push failed orders to CJ Dropshipping (fixes storeName rejection).
 * Run: node --env-file=.env scripts/retry-cj-sync.mjs
 */
import pg from "pg";

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

async function cjToken() {
  const refresh = process.env.CJ_REFRESH_TOKEN?.trim();
  if (refresh) {
    const res = await fetch(`${CJ_BASE}/authentication/refreshAccessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    const body = await res.json();
    if (body.code === 200 || body.result) return body.data.accessToken;
  }
  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: process.env.CJ_API_KEY }),
  });
  const body = await res.json();
  if (body.code !== 200 && !body.result) throw new Error(body.message || "CJ auth failed");
  return body.data.accessToken;
}

async function cjPost(token, path, data, extraHeaders = {}) {
  const res = await fetch(`${CJ_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CJ-Access-Token": token,
      ...extraHeaders,
    },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (body.code !== 200 && body.result !== true) throw new Error(body.message || JSON.stringify(body));
  return body.data;
}

async function cjGet(token, path) {
  const res = await fetch(`${CJ_BASE}${path}`, {
    headers: { "CJ-Access-Token": token, "Content-Type": "application/json" },
  });
  const body = await res.json();
  if (body.code !== 200 && body.result !== true) throw new Error(body.message || JSON.stringify(body));
  return body.data;
}

async function applyLogistics(token, orderCode, preferred) {
  try {
    const options = await cjGet(token, `/shopping/order/getOrderLogisticsInfo?orderCode=${encodeURIComponent(orderCode)}`);
    if (!Array.isArray(options) || !options.length) return null;
    const pool = options.filter((o) => o.hasStock !== false);
    const list = pool.length ? pool : options;
    const chosen =
      list.find((o) => o.logisticsName === preferred) ??
      list.find((o) => o.isChecked) ??
      list[0];
    if (!chosen?.id) return chosen?.logisticsName ?? null;
    await cjPost(token, "/shopping/order/updateLogistics", {
      id: chosen.id,
      orderCode,
      logisticsName: chosen.logisticsName,
      from: 1,
    });
    return chosen.logisticsName;
  } catch {
    return null;
  }
}

const pool = new pg.Pool({
  connectionString: `postgresql://postgres:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@db.zpvkbwovurryqqqvdxzb.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

const token = await cjToken();
const payType = Number(process.env.CJ_PAY_TYPE ?? 3);
const logisticName = process.env.CJ_LOGISTIC_NAME?.trim() || "CJPacket Ordinary";
const storeName = process.env.CJ_STORE_NAME?.trim();
const platformToken = process.env.CJ_PLATFORM_TOKEN?.trim();
const extraHeaders = platformToken ? { platformToken } : {};

const { rows: orders } = await pool.query(`
  select * from orders where cj_order_id is null order by created_at desc
`);

console.log(`Retrying ${orders.length} order(s)...`);

for (const order of orders) {
  const { rows: items } = await pool.query(
    `select oi.*, p.fulfillment_source, p.cj_product_id, p.images, pv.cj_variant_id
     from order_items oi
     join products p on p.id = oi.product_id
     left join product_variants pv on pv.id = oi.variant_id
     where oi.order_id = $1`,
    [order.id],
  );

  const cjItems = items.filter((i) => i.fulfillment_source === "cj" && i.cj_variant_id);
  if (!cjItems.length) {
    console.log(`  skip ${order.order_number}: no CJ items`);
    continue;
  }

  const products = cjItems.map((item) => ({
    vid: item.cj_variant_id,
    quantity: item.quantity,
    storeLineItemId: item.id,
    unitPrice: Number(item.unit_price),
    storeProductId: item.product_id,
    storeProductImg: item.images?.[0] ?? "",
  }));

  const payload = {
    orderNumber: order.order_number,
    shippingZip: order.ship_pincode,
    shippingCountry: order.ship_country || "India",
    shippingCountryCode: "IN",
    shippingProvince: order.ship_state,
    shippingCity: order.ship_city,
    shippingPhone: String(order.ship_phone).replace(/\D/g, "").slice(-15),
    shippingCustomerName: order.ship_full_name,
    shippingAddress: order.ship_line1,
    shippingAddress2: order.ship_line2 ?? "",
    remark: `GadgetVault ${order.order_number} · Total ₹${order.total}`,
    shopAmount: Number(order.total),
    storeOrderTime: Math.floor(new Date(order.created_at).getTime() / 1000),
    logisticName,
    fromCountryCode: "CN",
    platform: "Api",
    shopLogisticsType: 2,
    orderFlow: 1,
    payType,
    products,
  };
  if (storeName) payload.storeName = storeName;

  try {
    const result = await cjPost(token, "/shopping/order/createOrderV3", payload, extraHeaders);
    const cjOrderId = String(result.orderNum ?? result.orderId ?? order.order_number);
    const logistics = await applyLogistics(token, cjOrderId, logisticName);
    await pool.query(
      `update orders set cj_order_id = $1, cj_status = $2, cj_submitted_at = now(), cj_error = $3, status = 'sent_to_manufacturer' where id = $4`,
      [cjOrderId, payType === 2 ? "SUBMITTED_PAID" : "SUBMITTED", logistics ? null : "Select shipping in CJ if picking fails", order.id],
    );
    console.log(`  ✓ ${order.order_number} → CJ ${cjOrderId}${logistics ? ` (${logistics})` : ""}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await pool.query(`update orders set cj_error = $1 where id = $2`, [msg, order.id]);
    console.log(`  ✗ ${order.order_number}: ${msg}`);
  }
}

await pool.end();
console.log("Done.");
