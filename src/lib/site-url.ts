import { SHOPIFY_CANONICAL_ORIGIN, SHOPIFY_OAUTH_REDIRECT_URI } from "@/lib/shopify-oauth-config";

/** Single place to change domain — localhost now, Hostinger/Vercel later. */
function trimSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function readEnv(key: string): string {
  if (typeof import.meta !== "undefined" && import.meta.env?.[key]) {
    return String(import.meta.env[key]).trim();
  }
  if (typeof process !== "undefined" && process.env?.[key]) {
    return String(process.env[key]).trim();
  }
  return "";
}

/** Local/dev origin (Admin OAuth, internal links). Default: http://localhost:8080 */
export function appLocalOrigin(): string {
  return trimSlash(readEnv("VITE_APP_URL") || "http://localhost:8080");
}

/**
 * Public HTTPS origin for Shopify Customer Account API (callbacks must be HTTPS).
 * Hostinger par sirf VITE_APP_PUBLIC_URL change karo — same as VITE_APP_URL if both match.
 */
export function appPublicOrigin(): string {
  const explicit = readEnv("VITE_APP_PUBLIC_URL");
  if (explicit) return trimSlash(explicit);
  const base = appLocalOrigin();
  if (base.startsWith("https://")) return base;
  return trimSlash(readEnv("VITE_APP_FALLBACK_HTTPS") || "https://gadgetvault.in");
}

/** Best origin for current request (server) or configured default. */
export function appOriginFromRequest(request?: Request): string {
  if (request) {
    try {
      return trimSlash(new URL(request.url).origin);
    } catch {
      /* fall through */
    }
  }
  return appLocalOrigin();
}

export function shopifyAdminOAuthOrigin(request?: Request): string {
  if (request) {
    try {
      const origin = trimSlash(new URL(request.url).origin);
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        return origin;
      }
    } catch {
      /* fall through */
    }
  }

  const local = appLocalOrigin();
  if (/^http:\/\/(localhost|127\.0\.0\.1)/i.test(local)) {
    return local;
  }

  return SHOPIFY_CANONICAL_ORIGIN;
}

export function shopifyAdminOAuthCallbackUrl(request?: Request): string {
  const origin = shopifyAdminOAuthOrigin(request);
  if (origin === SHOPIFY_CANONICAL_ORIGIN) {
    return SHOPIFY_OAUTH_REDIRECT_URI;
  }
  return `${origin}/api/shopify/auth/callback`;
}

/** Allowed HTTPS origins for Shopify Customer OAuth (must match Shopify Admin Application setup). */
export function shopifyCustomerAllowedOrigins(): string[] {
  const origins = new Set<string>();
  origins.add(appPublicOrigin());
  origins.add(trimSlash(readEnv("VITE_APP_FALLBACK_HTTPS") || "https://gadgetvault.in"));
  for (const extra of [
    "https://gadgetvault-two.vercel.app",
    "https://gadgetvault-eight.vercel.app",
    "https://www.gadgetvault.in",
    readEnv("VITE_APP_PUBLIC_URL"),
    readEnv("VITE_APP_URL"),
  ]) {
    if (extra?.startsWith("https://")) origins.add(trimSlash(extra));
  }
  return [...origins];
}

/** Pick callback URL from current request origin when whitelisted, else canonical public URL. */
export function shopifyCustomerCallbackUrl(request?: Request): string {
  if (request) {
    try {
      const origin = trimSlash(new URL(request.url).origin);
      if (origin.startsWith("https://") && shopifyCustomerAllowedOrigins().includes(origin)) {
        return `${origin}/account/authorize`;
      }
    } catch {
      /* fall through */
    }
  }
  return `${appPublicOrigin()}/account/authorize`;
}

export function shopifyCustomerLogoutUrl(request?: Request): string {
  if (request) {
    try {
      const origin = trimSlash(new URL(request.url).origin);
      if (origin.startsWith("https://") && shopifyCustomerAllowedOrigins().includes(origin)) {
        return `${origin}/account/logout`;
      }
    } catch {
      /* fall through */
    }
  }
  return `${appPublicOrigin()}/account/logout`;
}

export function shopifyCustomerJavascriptOrigin(request?: Request): string {
  if (request) {
    try {
      const origin = trimSlash(new URL(request.url).origin);
      if (origin.startsWith("https://") && shopifyCustomerAllowedOrigins().includes(origin)) {
        return origin;
      }
    } catch {
      /* fall through */
    }
  }
  return appPublicOrigin();
}

/** Values to paste in Shopify Admin → Headless → Customer Account API → Application setup */
export function shopifyCustomerApiSetupValues() {
  return {
    callbackUri: shopifyCustomerCallbackUrl(),
    javascriptOrigin: shopifyCustomerJavascriptOrigin(),
    logoutUri: shopifyCustomerLogoutUrl(),
    publicOrigin: appPublicOrigin(),
    localOrigin: appLocalOrigin(),
    hostingerHint:
      "Production domain: https://gadgetvault.in — Shopify Customer API mein ye 3 URLs use karo.",
  };
}
