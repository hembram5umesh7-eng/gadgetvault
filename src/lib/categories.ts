import { useEffect, useState } from "react";
import { getStoreCategories } from "@/lib/category.functions";
import type { StoreCategory } from "@/lib/shopify-categories";

export type { StoreCategory };

const CATEGORY_COLORS = [
  "bg-brand-yellow",
  "bg-brand-mint",
  "bg-brand-violet",
  "bg-brand-coral",
  "bg-brand-pink",
] as const;

export function categoryColor(index: number) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

export function useCategories() {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoreCategories()
      .then((data) => setCategories(data))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
}

export async function fetchCategoryBySlug(slug: string) {
  const { fetchStoreCategoryBySlug } = await import("@/lib/shopify-categories");
  return fetchStoreCategoryBySlug(slug);
}
