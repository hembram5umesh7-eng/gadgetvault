import {
  fetchShopifyCollectionByHandle,
  fetchShopifyCollections,
  type ShopifyCollectionNode,
} from "@/integrations/shopify/storefront";

/** Category = Shopify Collection (single source of truth — no GadgetVault DB). */
export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  productCount: number;
}

/** Shopify system collections — never show in nav */
export const SKIP_COLLECTION_HANDLES = new Set([
  "frontpage",
  "all",
  "globo-basis-collection",
  "globo_basis_collection",
]);

export function normalizeCategorySlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/^\/+/, "");
}

export function isBrowsableCollection(handle: string): boolean {
  const key = normalizeCategorySlug(handle);
  return Boolean(key) && !SKIP_COLLECTION_HANDLES.has(key);
}

export function mapCollectionToStoreCategory(
  node: ShopifyCollectionNode,
  sortOrder = 0,
): StoreCategory {
  return {
    id: node.id,
    name: node.title,
    slug: normalizeCategorySlug(node.handle),
    description: node.description || null,
    image_url: node.image?.url ?? null,
    sort_order: sortOrder,
    productCount: node.productCount,
  };
}

/** All Shopify collections for Headless storefront — used for nav, filters, category pages. */
export async function loadStoreCategories(): Promise<StoreCategory[]> {
  const collections = await fetchShopifyCollections({ first: 100 });
  return collections
    .filter((c) => isBrowsableCollection(c.handle))
    .map((c, i) => mapCollectionToStoreCategory(c, i + 1));
}

export async function fetchStoreCategoryBySlug(slug: string): Promise<StoreCategory | null> {
  const normalized = normalizeCategorySlug(slug);
  const fromShopify = await fetchShopifyCollectionByHandle(normalized).catch(() => null);
  if (!fromShopify || !isBrowsableCollection(fromShopify.handle)) return null;
  return mapCollectionToStoreCategory(fromShopify);
}
