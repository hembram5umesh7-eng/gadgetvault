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
  };
}

/** All browsable Shopify collections (for enrichment + auto-discovery). */
export async function fetchAllShopifyCollections(): Promise<StoreCategory[]> {
  const collections = await fetchShopifyCollections({ first: 50 });
  return collections
    .filter((c) => isBrowsableCollection(c.handle))
    .map((c, i) => mapCollectionToStoreCategory(c, i + 1));
}

/**
 * Nav + shop categories:
 * 1. All Supabase rows with active=true (Admin "LIVE") — always shown
 * 2. Enriched with Shopify collection title/image when handle matches
 * 3. New Shopify collections (with products) auto-added if not in DB yet
 */
export async function loadStoreCategories(): Promise<StoreCategory[]> {
  const { data: dbRows } = await supabaseAdmin
    .from("categories")
    .select("id,name,slug,description,image_url,sort_order,active")
    .order("sort_order");

  let shopifyCats: StoreCategory[] = [];
  try {
    shopifyCats = await fetchAllShopifyCollections();
  } catch {
    /* Supabase-only fallback below */
  }

  const shopifyBySlug = new Map(shopifyCats.map((c) => [normalizeCategorySlug(c.slug), c]));

  const activeDb = (dbRows ?? []).filter((r) => r.active !== false);

  const merged: StoreCategory[] = activeDb.map((row) => {
    const slug = normalizeCategorySlug(row.slug);
    const shopify = shopifyBySlug.get(slug);
    return {
      id: row.id,
      name: row.name || shopify?.name || slug,
      slug,
      description: row.description ?? shopify?.description ?? null,
      image_url: row.image_url ?? shopify?.image_url ?? null,
      sort_order: row.sort_order ?? 0,
    };
  });

  const knownSlugs = new Set(merged.map((c) => c.slug));

  for (const sc of shopifyCats) {
    if (knownSlugs.has(sc.slug)) continue;
    if (sc.productCount <= 0) continue;
    merged.push(sc);
    knownSlugs.add(sc.slug);
  }

  merged.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  return merged;
}

/** Upsert Shopify collections into Supabase — preserves Admin LIVE/HIDDEN on existing rows. */
export async function syncShopifyCollectionsToSupabase(): Promise<{ synced: number }> {
  const collections = await fetchShopifyCollections({ first: 50 });
  let synced = 0;

  for (const [index, col] of collections.entries()) {
    if (!isBrowsableCollection(col.handle)) continue;

    const slug = normalizeCategorySlug(col.handle);

    const { data: existing } = await supabaseAdmin
      .from("categories")
      .select("active")
      .eq("slug", slug)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("categories").upsert(
      {
        name: col.title,
        slug,
        description: col.description || null,
        image_url: col.image?.url ?? null,
        sort_order: index + 1,
        active: existing ? existing.active : col.productCount > 0,
      },
      { onConflict: "slug" },
    );

    if (!error) synced++;
  }

  return { synced };
}

export async function fetchStoreCategoryBySlug(slug: string): Promise<StoreCategory | null> {
  const normalized = normalizeCategorySlug(slug);

  const { data: dbRows } = await supabaseAdmin
    .from("categories")
    .select("id,name,slug,description,image_url,sort_order,active")
    .eq("active", true);

  const dbMatch = (dbRows ?? []).find((r) => normalizeCategorySlug(r.slug) === normalized);
  if (dbMatch) {
    return {
      id: dbMatch.id,
      name: dbMatch.name,
      slug: normalized,
      description: dbMatch.description,
      image_url: dbMatch.image_url,
      sort_order: dbMatch.sort_order,
    };
  }

  const fromShopify = await fetchShopifyCollectionByHandle(normalized).catch(() => null);
  if (fromShopify && isBrowsableCollection(fromShopify.handle)) {
    return mapCollectionToStoreCategory(fromShopify);
  }

  return null;
}
