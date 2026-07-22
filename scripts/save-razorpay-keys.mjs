/** Save Razorpay keys from .env to Supabase app_settings. Run: node --env-file=.env scripts/save-razorpay-keys.mjs */
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const keyId = process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

if (!url || !key) {
  console.error("Missing Supabase URL or service role key");
  process.exit(1);
}
if (!keyId || !keySecret) {
  console.error("Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env");
  process.exit(1);
}

const { error } = await fetch(`${url}/rest/v1/app_settings`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates",
  },
  body: JSON.stringify({
    key: "razorpay",
    value: {
      key_id: keyId,
      key_secret: keySecret,
      ...(webhookSecret ? { webhook_secret: webhookSecret } : {}),
      updated_at: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  }),
}).then(async (r) => ({ error: r.ok ? null : new Error(await r.text()) }));

if (error) {
  console.error("DB save failed:", error.message);
  process.exit(1);
}

const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
const res = await fetch("https://api.razorpay.com/v1/orders", {
  method: "POST",
  headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
  body: JSON.stringify({ amount: 100, currency: "INR", receipt: `gv-test-${Date.now()}` }),
});

if (!res.ok) {
  console.error("Razorpay API test failed:", res.status, (await res.text()).slice(0, 120));
  process.exit(1);
}

console.log("✓ Razorpay keys saved to database");
console.log("✓ Live API test OK —", keyId.slice(0, 16) + "…");
if (webhookSecret) console.log("✓ Webhook secret saved");
