import type { ProductCardData } from "@/components/product-card";
import {
  fetchShopifyProductByHandle,
  fetchShopifyProducts,
  fetchShopifyProductsByCollection,
  searchShopifyProducts,
  countShopifyProducts,
} from "@/integrations/shopify/storefront";
import { mapProductCard, mapProductDetail, type MappedProduct } from "@/integrations/shopify/product-mapper";
import { productMatchesNavCategory, toCategoryMatchInput } from "@/lib/category-map";

export type { MappedProduct };

export async function fetchProductCards(opts?: {
  limit?: number;
  collection?: string;
  tag?: string;
  bestseller?: boolean;
}): Promise<ProductCardData[]> {
  let nodes;
  if (opts?.collection) {
    nodes = await fetchShopifyProductsByCollection(opts.collection, opts.limit ?? 48);
  } else {
    let query = "available_for_sale:true";
    if (opts?.tag) query += ` AND tag:${opts.tag}`;
    if (opts?.bestseller) query += " AND tag:bestseller";
    nodes = await fetchShopifyProducts({ first: opts?.limit ?? 24, query });
  }
  return nodes.map(mapProductCard);
}

export async function fetchProductBySlug(slug: string): Promise<MappedProduct | null> {
  const node = await fetchShopifyProductByHandle(slug);
  if (!node) return null;
  return mapProductDetail(node);
}

export async function fetchProductsByCategory(categorySlug: string): Promise<ProductCardData[]> {
  const all = await fetchShopifyProducts({ first: 250, query: "available_for_sale:true" });

  const matched = all.filter((node) => productMatchesNavCategory(toCategoryMatchInput(node), categorySlug));

  if (matched.length) return matched.map(mapProductCard);

  // Fallback: include products without available_for_sale filter (draft channel sync lag)
  const allUnfiltered = await fetchShopifyProducts({ first: 250 });
  return allUnfiltered
    .filter((node) => productMatchesNavCategory(toCategoryMatchInput(node), categorySlug))
    .map(mapProductCard);
}

export async function searchProducts(opts: {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
  sort?: string;
}): Promise<ProductCardData[]> {
  const term = opts.q?.trim() ?? "";
  let nodes = term
    ? await searchShopifyProducts(term, 100)
    : await fetchShopifyProducts({ first: 100, query: "available_for_sale:true" });

  let list = nodes.map(mapProductCard);

  if (opts.category) list = list.filter((p) => p.category === opts.category);
  if (opts.min) list = list.filter((p) => p.base_price >= opts.min!);
  if (opts.max) list = list.filter((p) => p.base_price <= opts.max!);

  if (opts.sort === "price-asc") list = [...list].sort((a, b) => a.base_price - b.base_price);
  if (opts.sort === "price-desc") list = [...list].sort((a, b) => a.base_price - b.base_price);
  if (opts.sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));

  return list;
}

export async function fetchActiveProductCount(): Promise<number> {
  return countShopifyProducts();
}

export async function fetchProductsByHandles(handles: string[]): Promise<ProductCardData[]> {
  const out: ProductCardData[] = [];
  for (const handle of handles) {
    const p = await fetchProductBySlug(handle);
    if (p) out.push(p);
  }
  return out;
}
