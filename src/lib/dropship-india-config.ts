/** Public Dropship India portal — sub-admins login here (NOT Shopify admin). */
export const DROPSHIP_INDIA_PORTAL_URL = "https://dropshipindia.live";

export function dropshipIndiaPortalUrl(): string {
  return process.env.DROPSHIP_INDIA_PORTAL_URL?.trim() || DROPSHIP_INDIA_PORTAL_URL;
}
