import {
  appPublicOrigin,
  shopifyCustomerCallbackUrl,
  shopifyCustomerLogoutUrl,
} from "@/lib/site-url";

function env(key: string): string {
  if (typeof process !== "undefined" && process.env?.[key]) return String(process.env[key]).trim();
  return "";
}

export function shopifyCustomerAccountShopId(): string {
  return env("SHOPIFY_CUSTOMER_ACCOUNT_SHOP_ID") || "96359809339";
}

export function shopifyCustomerAccountClientId(): string {
  return (
    env("VITE_SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID") ||
    env("SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID") ||
    ""
  );
}

export function shopifyCustomerAuthorizeUrl(): string {
  return (
    env("SHOPIFY_CUSTOMER_ACCOUNT_AUTHORIZE_URL") ||
    `https://shopify.com/authentication/${shopifyCustomerAccountShopId()}/oauth/authorize`
  );
}

export function shopifyCustomerTokenUrl(): string {
  return (
    env("SHOPIFY_CUSTOMER_ACCOUNT_TOKEN_URL") ||
    `https://shopify.com/authentication/${shopifyCustomerAccountShopId()}/oauth/token`
  );
}

export function shopifyCustomerLogoutEndpoint(): string {
  return (
    env("SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_URL") ||
    `https://shopify.com/authentication/${shopifyCustomerAccountShopId()}/logout`
  );
}

export function shopifyCustomerGraphqlUrl(): string {
  const version = env("SHOPIFY_CUSTOMER_ACCOUNT_API_VERSION") || "2024-07";
  return `https://shopify.com/${shopifyCustomerAccountShopId()}/account/customer/api/${version}/graphql`;
}

export const SHOPIFY_CUSTOMER_SCOPES = "openid email customer-account-api:full";

export function shopifyCustomerAccountConfigured(): boolean {
  return Boolean(shopifyCustomerAccountClientId() && shopifyCustomerAccountShopId());
}

/** PKCE S256 (server-safe) */
export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomBase64Url(32);
  const challenge = await sha256Base64Url(verifier);
  return { verifier, challenge };
}

function randomBase64Url(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return toBase64Url(bytes);
}

async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return toBase64Url(new Uint8Array(hash));
}

function toBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function buildShopifyCustomerAuthorizeUrl(opts: {
  state: string;
  codeChallenge: string;
  redirectUri?: string;
  loginHint?: string;
  locale?: string;
  regionCountry?: string;
}): string {
  const params = new URLSearchParams({
    client_id: shopifyCustomerAccountClientId(),
    scope: SHOPIFY_CUSTOMER_SCOPES,
    response_type: "code",
    redirect_uri: opts.redirectUri ?? shopifyCustomerCallbackUrl(),
    state: opts.state,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
    locale: opts.locale ?? "en",
    region_country: opts.regionCountry ?? "IN",
  });
  const hint = opts.loginHint?.trim().toLowerCase();
  if (hint && hint.includes("@")) params.set("login_hint", hint);
  return `${shopifyCustomerAuthorizeUrl()}?${params}`;
}

export async function exchangeShopifyCustomerCode(opts: {
  code: string;
  codeVerifier: string;
  redirectUri?: string;
}): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: shopifyCustomerAccountClientId(),
    code: opts.code,
    redirect_uri: opts.redirectUri ?? shopifyCustomerCallbackUrl(),
    code_verifier: opts.codeVerifier,
  });

  const res = await fetch(shopifyCustomerTokenUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Customer token exchange failed (${res.status}): ${text.slice(0, 200)}`);

  const json = JSON.parse(text) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) throw new Error("No access_token in customer OAuth response");
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_in: json.expires_in,
  };
}

export function buildShopifyCustomerLogoutRedirect(idTokenHint?: string): string {
  const url = new URL(shopifyCustomerLogoutEndpoint());
  url.searchParams.set("post_logout_redirect_uri", shopifyCustomerLogoutUrl());
  if (idTokenHint) url.searchParams.set("id_token_hint", idTokenHint);
  return url.toString();
}

export function customerAccountApiNote(): string {
  return `Customer login uses HTTPS origin ${appPublicOrigin()}. Localhost HTTP is not supported by Shopify Customer API.`;
}
