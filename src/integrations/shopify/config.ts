export function shopifyStoreDomain(): string {
  const domain =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SHOPIFY_STORE_DOMAIN) ||
    (typeof process !== "undefined" && process.env?.VITE_SHOPIFY_STORE_DOMAIN) ||
    (typeof process !== "undefined" && process.env?.SHOPIFY_STORE_DOMAIN) ||
    "";
  return String(domain).replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function shopifyStorefrontToken(): string {
  return String(
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SHOPIFY_STOREFRONT_TOKEN) ||
      (typeof process !== "undefined" && process.env?.VITE_SHOPIFY_STOREFRONT_TOKEN) ||
      (typeof process !== "undefined" && process.env?.SHOPIFY_STOREFRONT_TOKEN) ||
      "",
  );
}

export function shopifyConfigured(): boolean {
  return Boolean(shopifyStoreDomain() && shopifyStorefrontToken());
}

export function shopifyStorefrontApiUrl(): string {
  const domain = shopifyStoreDomain();
  return `https://${domain}/api/2024-10/graphql.json`;
}

export function shopifyAdminApiUrl(): string {
  const domain = shopifyStoreDomain();
  return `https://${domain}/admin/api/2024-10/graphql.json`;
}
