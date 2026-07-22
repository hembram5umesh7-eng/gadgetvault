/** Canonical production origin — OAuth redirect MUST use this host (matches Shopify App URL). */
export const SHOPIFY_CANONICAL_ORIGIN = "https://gadgetvault.in";

export const SHOPIFY_OAUTH_REDIRECT_URI = `${SHOPIFY_CANONICAL_ORIGIN}/api/shopify/auth/callback`;

export const SHOPIFY_APP_URL = `${SHOPIFY_CANONICAL_ORIGIN}/admin/shopify`;
