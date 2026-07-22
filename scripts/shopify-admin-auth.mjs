/** Shared Admin API token resolver for CLI scripts */

let cached = null;

export async function resolveAdminToken(env = process.env) {
  const domain = (env.VITE_SHOPIFY_STORE_DOMAIN || env.SHOPIFY_STORE_DOMAIN || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const clientId = env.SHOPIFY_CLIENT_ID?.trim() || env.SHOPIFY_API_KEY?.trim();
  const clientSecret = env.SHOPIFY_CLIENT_SECRET?.trim() || env.SHOPIFY_API_SECRET?.trim();
  const fallback = env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();

  if (clientId && clientSecret && domain) {
    if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;

    const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const text = await res.text();
    if (res.ok) {
      const json = JSON.parse(text);
      if (json.access_token) {
        cached = {
          token: json.access_token,
          expiresAt: Date.now() + (json.expires_in ?? 86399) * 1000,
        };
        return json.access_token;
      }
    }

    if (/app_not_installed/i.test(text)) {
      console.warn("\n⚠ Shopify Dev app not installed on store yet.");
      console.warn("Install: https://admin.shopify.com/store/gharstoreessential/settings/apps/development");
      console.warn("Open your GadgetVault app → Install app → then retry sync.\n");
    }
  }

  if (fallback) return fallback;
  throw new Error("No Shopify Admin token — install Dev app or set SHOPIFY_ADMIN_ACCESS_TOKEN");
}
