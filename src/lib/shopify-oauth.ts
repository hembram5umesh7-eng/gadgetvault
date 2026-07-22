import { shopifyStoreDomain } from "@/integrations/shopify/config";

export const SHOPIFY_OAUTH_SCOPES = [
  "read_products",
  "write_products",
  "read_publications",
  "write_publications",
  "read_draft_orders",
  "write_draft_orders",
  "read_orders",
  "write_orders",
].join(",");

export function shopifyOAuthRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/shopify/auth/callback`;
}

export function buildShopifyOAuthUrl(opts: { clientId: string; redirectUri: string; state: string }): string {
  const domain = shopifyStoreDomain();
  const params = new URLSearchParams({
    client_id: opts.clientId,
    scope: SHOPIFY_OAUTH_SCOPES,
    redirect_uri: opts.redirectUri,
    state: opts.state,
  });
  return `https://${domain}/admin/oauth/authorize?${params}`;
}

export async function exchangeShopifyOAuthCode(opts: {
  shop: string;
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ access_token: string; scope: string }> {
  const res = await fetch(`https://${opts.shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      code: opts.code,
      redirect_uri: opts.redirectUri,
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`OAuth token exchange failed: ${text.slice(0, 200)}`);

  const json = JSON.parse(text) as { access_token?: string; scope?: string };
  if (!json.access_token) throw new Error("No access_token in OAuth response");
  return { access_token: json.access_token, scope: json.scope ?? "" };
}
