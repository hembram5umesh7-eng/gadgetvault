import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { ProductCardData } from "@/components/product-card";
import { PRODUCT_CARD_SELECT } from "@/lib/product-pricing";
import {
  getPersonalizationSignals,
  getRecentSearches,
  getRecentlyViewed,
  PERSONALIZATION_EVENT,
  type RecentlyViewedEntry,
  type SearchHistoryEntry,
} from "@/lib/user-personalization";

function orderByIds(products: ProductCardData[], ids: string[]): ProductCardData[] {
  const map = new Map(products.map((p) => [p.id, p]));
  return ids.map((id) => map.get(id)).filter(Boolean) as ProductCardData[];
}

export function usePersonalizedHome() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [recentlyViewed, setRecentlyViewed] = useState<ProductCardData[]>([]);
  const [recommended, setRecommended] = useState<ProductCardData[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchHistoryEntry[]>([]);
  const [viewMeta, setViewMeta] = useState<RecentlyViewedEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const views = getRecentlyViewed(userId);
    const searches = getRecentSearches(userId);
    const { categories, queries, viewedIds } = getPersonalizationSignals(userId);

    setRecentSearches(searches);
    setViewMeta(views);

    const viewedIdsOrdered = views.map((v) => v.id).slice(0, 12);
    let viewedProducts: ProductCardData[] = [];
    if (viewedIdsOrdered.length) {
      const { data } = await supabase
        .from("products")
        .select(PRODUCT_CARD_SELECT)
        .in("id", viewedIdsOrdered)
        .eq("active", true);
      viewedProducts = orderByIds((data as ProductCardData[]) ?? [], viewedIdsOrdered);
    }
    setRecentlyViewed(viewedProducts);

    let recs: ProductCardData[] = [];
    const exclude = new Set(viewedIds);

    if (categories.length) {
      const { data } = await supabase
        .from("products")
        .select(PRODUCT_CARD_SELECT)
        .eq("active", true)
        .in("category", categories.slice(0, 3))
        .order("created_at", { ascending: false })
        .limit(16);
      recs = ((data as ProductCardData[]) ?? []).filter((p) => !exclude.has(p.id));
    }

    if (recs.length < 4 && queries.length) {
      const q = queries[0].replace(/[%_\\]/g, "").slice(0, 60);
      if (q) {
        const { data } = await supabase
          .from("products")
          .select(PRODUCT_CARD_SELECT)
          .eq("active", true)
          .or(`name.ilike.%${q}%,brand.ilike.%${q}%,category.ilike.%${q}%`)
          .limit(12);
        const extra = ((data as ProductCardData[]) ?? []).filter(
          (p) => !exclude.has(p.id) && !recs.some((r) => r.id === p.id),
        );
        recs = [...recs, ...extra];
      }
    }

    if (recs.length < 4) {
      const { data } = await supabase
        .from("products")
        .select(PRODUCT_CARD_SELECT)
        .eq("active", true)
        .eq("is_bestseller", true)
        .limit(8);
      const extra = ((data as ProductCardData[]) ?? []).filter(
        (p) => !exclude.has(p.id) && !recs.some((r) => r.id === p.id),
      );
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
  };
}
