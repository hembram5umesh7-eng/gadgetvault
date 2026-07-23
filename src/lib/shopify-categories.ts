import {
  fetchShopifyCollectionByHandle,
  fetchShopifyCollections,
  type ShopifyCollectionNode,
} from "@/integrations/shopify/storefront";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { StoreCategory } from "@/lib/categories";

/** Shopify system collections — never show in nav or assign as product category */
export const SKIP_COLLECTION_HANDLES = new Set([
  "frontpage",
  "all",
  "globo-basis-collection",
  "globo_basis_collection",
]);

export function isBrowsableCollection(handle: string): boolean {
  const key = handle.trim().toLowerCase();
  return Boolean(key) && !SKIP_COLLECTION_HANDLES.has(key);
}

export function mapCollectionToStoreCategory(
  node: ShopifyCollectionNode,
  sortOrder = 0,
): StoreCategory {
  return {
    id: node.id,
    name: node.title,
    slug: node.handle,
    description: node.description || null,
    image_url: node.image?.url ?? null,
    sort_order: sortOrder,
  };
}

/** Live categories from Shopify Headless (source of truth for nav + filters). */
export async function fetchShopifyStoreCategories(): Promise<StoreCategory[]> {
  const collections = await fetchShopifyCollections({ first: 50 });
  return collections
    .filter((c) => isBrowsableCollection(c.handle) && c.productCount > 0)
    .map((c, i) => mapCollectionToStoreCategory(c, i + 1));
}

/** Merge Shopify collections with Supabase overrides (sort_order, image, active). */
export async function loadStoreCategories(): Promise<StoreCategory[]> {
  let shopifyCats: StoreCategory[] = [];
  try {
    shopifyCats = await fetchShopifyStoreCategories();
  } catch {
    /* fall back to Supabase only */
  }

  if (shopifyCats.length === 0) {
    const { data } = await supabaseAdmin
      .from("categories")
      .select("id,name,slug,description,image_url,sort_order")
      .eq("active", true)
      .order("sort_order");
    return (data as StoreCategory[]) ?? [];
  }

  const { data: dbRows } = await supabaseAdmin
    .from("categories")
    .select("slug,sort_order,image_url,description,active");

  const overrides = new Map((dbRows ?? []).map((r) => [r.slug, r]));

  const merged = shopifyCats
    .map((cat, index) => {
      const o = overrides.get(cat.slug);
      if (o && o.active === false) return null;
      return {
        ...cat,
        sort_order: o?.sort_order ?? cat.sort_order ?? index + 1,
        image_url: o?.image_url ?? cat.image_url,
        description: o?.description ?? cat.description,
      };
    })
    .filter(Boolean) as StoreCategory[];

  merged.sort((a, b) => a.sort_order - b.sort_order);
  return merged;
}

/** Upsert Shopify collections into Supabase (Admin → Sync Everything). */
export async function syncShopifyCollectionsToSupabase(): Promise<{ synced: number }> {
  const collections = await fetchShopifyCollections({ first: 50 });
  let synced = 0;

  for (const [index, col] of collections.entries()) {
    if (!isBrowsableCollection(col.handle)) continue;

    const { error } = await supabaseAdmin.from("categories").upsert(
      {
        name: col.title,
        slug: col.handle,
        description: col.description || null,
        image_url: col.image?.url ?? null,
        sort_order: index + 1,
        active: col.productCount > 0,
      },
      { onConflict: "slug" },
    );

    if (!error) synced++;
  }

  return { synced };
}

export async function fetchStoreCategoryBySlug(slug: string): Promise<StoreCategory | null> {
  const fromShopify = await fetchShopifyCollectionByHandle(slug).catch(() => null);
  if (fromShopify && isBrowsableCollection(fromShopify.handle)) {
    return mapCollectionToStoreCategory(fromShopify);
  }

  const { data } = await supabaseAdmin
    .from("categories")
    .select("id,name,slug,description,image_url,sort_order")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  return (data as StoreCategory | null) ?? null;
}
