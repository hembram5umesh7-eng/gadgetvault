import { createServerFn } from "@tanstack/react-start";
import { loadStoreCategories } from "@/lib/shopify-categories";

/** Public — nav, category pages, filters (live from Shopify Collections only). */
export const getStoreCategories = createServerFn({ method: "GET" }).handler(async () => {
  return loadStoreCategories();
});
