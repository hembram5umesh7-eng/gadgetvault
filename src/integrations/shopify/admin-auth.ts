import { shopifyStoreDomain } from "./config";
import { getStoredShopifyAdminToken, getStoredShopifyClientSecret } from "@/lib/shopify-token-store";
import { hasGraphqlErrorMatching } from "./graphql-errors";

type TokenCache = { token: string; expiresAt: number };
let cached: TokenCache | null = null;

function clientId(): string {
  return process.env.SHOPIFY_CLIENT_ID?.trim() || process.env.SHOPIFY_API_KEY?.trim() || "";
}

function clientSecret(): string {
  return (
    process.env.SHOPIFY_CLIENT_SECRET?.trim() ||
    process.env.SHOPIFY_API_SECRET?.trim() ||
    ""
  );
}

async function resolveClientSecret(): Promise<string> {
  const fromDb = await getStoredShopifyClientSecret();
  if (fromDb) return fromDb;
  return clientSecret();
}

function staticAdminToken(): string {
  return process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim() ?? "";
}

export function shopifyAdminCredentialsConfigured(): boolean {
  return Boolean(shopifyStoreDomain() && (staticAdminToken() || clientId()));
}

async function exchangeClientCredentials(): Promise<string> {
  const id = clientId();
  const secret = await resolveClientSecret();
  const domain = shopifyStoreDomain();
  if (!id || !secret || !domain) {
    throw new Error("Missing SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET");
  }

  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;

  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: id,
      client_secret: secret,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    if (/app_not_installed/i.test(text)) {
      throw new Error(
        "Shopify app not installed. Go to: Settings → Apps → Develop apps → Install your GadgetVault app on this store.",
      );
    }
    throw new Error(`Shopify token exchange failed (${res.status})`);
  }

  const json = JSON.parse(text) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("Shopify token exchange returned no access_token");

  cached = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 86399) * 1000,
  };
  return cached.token;
}

async function tokenCanReadProducts(token: string): Promise<boolean> {
  const domain = shopifyStoreDomain();
  if (!domain) return false;
  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query: "query { products(first: 1) { edges { node { id } } } }" }),
  });
  const json = (await res.json()) as { errors?: unknown };
  return !hasGraphqlErrorMatching(json.errors, /access denied|unauthorized|invalid api key/i);
}

/** Installed scopes for a token (Dev app installation). */
export async function fetchInstalledShopifyScopes(token: string): Promise<string[]> {
  const domain = shopifyStoreDomain();
  if (!domain) return [];
  const res = await fetch(`https://${domain}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({
      query: "query { currentAppInstallation { accessScopes { handle } } }",
    }),
  });
  const json = (await res.json()) as {
    data?: { currentAppInstallation?: { accessScopes?: { handle: string }[] } };
  };
  return json.data?.currentAppInstallation?.accessScopes?.map((s) => s.handle) ?? [];
}

export async function shopifyTokenHasOrderScopes(token: string): Promise<boolean> {
  const scopes = await fetchInstalledShopifyScopes(token);
  return scopes.includes("read_orders") && scopes.includes("write_orders");
}

async function collectShopifyTokenCandidates(): Promise<string[]> {
  const out: string[] = [];

  const fallback = staticAdminToken();
  if (fallback) out.push(fallback);

  const fromDb = await getStoredShopifyAdminToken();
  if (fromDb) out.push(fromDb);

  if (clientId() && clientSecret()) {
    try {
      out.push(await exchangeClientCredentials());
    } catch {
      /* optional */
    }
  }

  return [...new Set(out.filter(Boolean))];
}

/** Prefer DB token (admin UI) → Dev OAuth → legacy shpat_ in .env */
export async function resolveShopifyAdminAccessToken(): Promise<string> {
  for (const token of await collectShopifyTokenCandidates()) {
    if (await tokenCanReadProducts(token)) return token;
  }

  throw new Error(
    "Shopify Admin not connected — Admin → Shopify Connect → Connect Shopify dabao (scopes configure hone ke baad).",
  );
}

/** Token with read_orders + write_orders — required to cancel/sync orders in Shopify Admin. */
export async function resolveShopifyAdminAccessTokenForOrders(): Promise<string> {
  for (const token of await collectShopifyTokenCandidates()) {
    if (await shopifyTokenHasOrderScopes(token)) return token;
  }

  throw new Error(
    "Shopify order cancel/sync ke liye read_orders + write_orders scopes chahiye. " +
      "Admin → Shopify Connect → Dev app version mein ye scopes add karke Release karo, phir Connect Shopify dubara dabao.",
  );
}
