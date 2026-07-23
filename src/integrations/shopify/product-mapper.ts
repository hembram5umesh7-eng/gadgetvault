import type { ProductCardData } from "@/components/product-card";
import { resolveProductCategorySlug } from "@/lib/category-map";

export type ShopifyProductNode = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  productType?: string | null;
  descriptionHtml: string;
  tags: string[];
  priceRange: { minVariantPrice: { amount: string } };
  compareAtPriceRange?: { minVariantPrice: { amount: string } | null } | null;
  images: { edges: { node: { url: string } }[] };
  variants: {
    edges: {
      node: {
        id: string;
        title: string;
        availableForSale: boolean;
        price: { amount: string };
        compareAtPrice?: { amount: string } | null;
        image?: { url: string } | null;
        selectedOptions: { name: string; value: string }[];
      };
    }[];
  };
  collections?: { edges: { node: { handle: string; title: string } }[] };
};

export type ShopifyVariant = {
  id: string;
  size: string;
  color: string;
  color_hex: string;
  variant_image?: string | null;
  stock: number;
  price: number;
};

export type MappedProduct = ProductCardData & {
  description: string | null;
  specs: string | null;
  warranty_months: number;
  variants: ShopifyVariant[];
};

function inr(amount: string | undefined | null): number {
  const n = Number(amount);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function tagHas(tags: string[], key: string): boolean {
  return tags.some((t) => t.toLowerCase() === key.toLowerCase());
}

function metafieldInt(_node: ShopifyProductNode, key: string, fallback = 0): number {
  void key;
  void _node;
  return fallback;
}

function optionValue(options: { name: string; value: string }[], names: string[], fallback: string): string {
  for (const name of names) {
    const hit = options.find((o) => o.name.toLowerCase() === name.toLowerCase());
    if (hit?.value) return hit.value;
  }
  return options[0]?.value ?? fallback;
}

export function mapProductCard(node: ShopifyProductNode): ProductCardData {
  const base = inr(node.priceRange.minVariantPrice.amount);
  const compare = inr(node.compareAtPriceRange?.minVariantPrice?.amount);
  const marketing = compare > base ? compare : null;
  const collectionHandles = node.collections?.edges.map((e) => e.node.handle) ?? [];
  const collectionTitles = node.collections?.edges.map((e) => e.node.title) ?? [];
  const category = resolveProductCategorySlug({
    title: node.title,
    tags: node.tags,
    productType: node.productType,
    collectionHandles,
    collectionTitles,
  });

  return {
    id: node.id,
    name: node.title,
    slug: node.handle,
    base_price: base,
    marketing_price: marketing,
    images: node.images.edges.map((e) => e.node.url),
    category,
    brand: node.vendor || null,
    is_bestseller: tagHas(node.tags, "bestseller"),
    is_deal: tagHas(node.tags, "deal") || tagHas(node.tags, "flash-sale"),
  };
}

export function mapProductDetail(node: ShopifyProductNode): MappedProduct {
  const card = mapProductCard(node);
  const variants: ShopifyVariant[] = node.variants.edges.map(({ node: v }) => ({
    id: v.id,
    size: optionValue(v.selectedOptions, ["Size", "Model", "Product Specifications", "Title"], "Default"),
    color: optionValue(v.selectedOptions, ["Color", "Colour"], "Default"),
    color_hex: "#333333",
    variant_image: v.image?.url ?? null,
    stock: v.availableForSale ? 99 : 0,
    price: inr(v.price.amount),
  }));

  return {
    ...card,
    description: node.descriptionHtml || null,
    specs: null,
    warranty_months: metafieldInt(node, "warranty_months", tagHas(node.tags, "warranty") ? 6 : 0),
    variants,
  };
}

export function shopifyGidToNumericId(gid: string): string {
  const parts = gid.split("/");
  return parts[parts.length - 1] ?? gid;
}
