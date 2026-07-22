import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { ProductCardData } from "@/components/product-card";
import { fetchProductBySlug, fetchProductCards, fetchProductsByCategory, searchProducts } from "@/lib/products";
import {
  getPersonalizationSignals,
  getRecentSearches,
  getRecentlyViewed,
  PERSONALIZATION_EVENT,
  type RecentlyViewedEntry,
  type SearchHistoryEntry,
} from "@/lib/user-personalization";

function orderBySlugs(products: ProductCardData[], slugs: string[]): ProductCardData[] {
  const map = new Map(products.map((p) => [p.slug, p]));
  return slugs.map((slug) => map.get(slug)).filter(Boolean) as ProductCardData[];
}

async function resolveViewedProducts(views: RecentlyViewedEntry[]): Promise<ProductCardData[]> {
  const slugs = views.map((v) => v.slug).slice(0, 12);
  if (!slugs.length) return [];

  const fetched = await Promise.all(slugs.map((slug) => fetchProductBySlug(slug)));
  const cards = fetched.filter((p): p is NonNullable<typeof p> => Boolean(p));
  return orderBySlugs(cards, slugs);
}

export function usePersonalizedHome() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [recentlyViewed, setRecentlyViewed] = useState<ProductCardData[]>([]);
  const [recommended, setRecommended] = useState<ProductCardData[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchHistoryEntry[]>([]);
  const [viewMeta, setViewMeta] = useState<RecentlyViewedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const views = getRecentlyViewed(userId);
    const searches = getRecentSearches(userId);
    const { categories, queries, viewedIds } = getPersonalizationSignals(userId);

    setRecentSearches(searches);
    setViewMeta(views);

    const viewedProducts = await resolveViewedProducts(views);
    setRecentlyViewed(viewedProducts);

    let recs: ProductCardData[] = [];
    const exclude = new Set(viewedIds);

    if (categories.length) {
      for (const cat of categories.slice(0, 2)) {
        const byCat = await fetchProductsByCategory(cat);
        recs.push(...byCat.filter((p) => !exclude.has(p.id) && !recs.some((r) => r.id === p.id)));
        if (recs.length >= 8) break;
      }
    }

    if (recs.length < 4 && queries.length) {
      const q = queries[0].replace(/[%_\\]/g, "").slice(0, 60);
      if (q) {
        const extra = (await searchProducts({ q })).filter(
          (p) => !exclude.has(p.id) && !recs.some((r) => r.id === p.id),
        );
        recs = [...recs, ...extra];
      }
    }

    if (recs.length < 4) {
      const best = await fetchProductCards({ limit: 8, bestseller: true });
      const extra = best.filter((p) => !exclude.has(p.id) && !recs.some((r) => r.id === p.id));
      recs = [...recs, ...extra];
    }

    setRecommended(recs.slice(0, 8));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
    const onUpdate = () => void refresh();
    window.addEventListener(PERSONALIZATION_EVENT, onUpdate);
    return () => window.removeEventListener(PERSONALIZATION_EVENT, onUpdate);
  }, [refresh]);

  return {
    loading,
    recentlyViewed,
    recommended,
    recentSearches,
    viewMeta,
    hasPersonalization: recentlyViewed.length > 0 || recentSearches.length > 0,
    hasViewHistory: viewMeta.length > 0,
  };
}
