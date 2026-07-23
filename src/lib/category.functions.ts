import { createServerFn } from "@tanstack/react-start";
import { loadStoreCategories, syncShopifyCollectionsToSupabase } from "@/lib/shopify-categories";

/** Public — nav, category pages, search filters (live from Shopify collections). */
export const getStoreCategories = createServerFn({ method: "GET" }).handler(async () => {
  return loadStoreCategories();
});

/** Admin sync — called from full Shopify sync. */
export const syncStoreCategoriesFromShopify = createServerFn({ method: "POST" }).handler(async () => {
  return syncShopifyCollectionsToSupabase();
});
