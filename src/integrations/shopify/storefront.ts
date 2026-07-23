import {
  shopifyConfigured,
  shopifyStorefrontApiUrl,
  shopifyStorefrontToken,
} from "./config";
import type { ShopifyProductNode } from "./product-mapper";

const PRODUCT_CARD_FRAGMENT = `
  id
  title
  handle
  vendor
  productType
  tags
  priceRange { minVariantPrice { amount currencyCode } }
  compareAtPriceRange { minVariantPrice { amount } }
  images(first: 8) { edges { node { url } } }
  collections(first: 10) { edges { node { handle title } } }
`;

const PRODUCT_DETAIL_FRAGMENT = `
  ${PRODUCT_CARD_FRAGMENT}
  descriptionHtml
  variants(first: 50) {
    edges {
      node {
        id
        title
        availableForSale
        price { amount }
        compareAtPrice { amount }
        image { url }
        selectedOptions { name value }
      }
    }
  }
`;

export type ShopifyCollectionNode = {
  id: string;
  handle: string;
  title: string;
  description?: string | null;
  image?: { url: string } | null;
  productCount: number;
};

async function storefrontQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!shopifyConfigured()) {
    throw new Error("Shopify not configured — set VITE_SHOPIFY_STORE_DOMAIN and VITE_SHOPIFY_STOREFRONT_TOKEN in .env");
  }

  const res = await fetch(shopifyStorefrontApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": shopifyStorefrontToken(),
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  if (!json.data) throw new Error("Empty Shopify response");
  return json.data;
}

export async function fetchShopifyProducts(opts: {
  first?: number;
  query?: string;
  sortKey?: "CREATED_AT" | "TITLE" | "PRICE";
  reverse?: boolean;
}): Promise<ShopifyProductNode[]> {
  const data = await storefrontQuery<{
    products: { edges: { node: ShopifyProductNode }[] };
  }>(
    `query Products($first: Int!, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
      products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
        edges { node { ${PRODUCT_CARD_FRAGMENT} } }
      }
    }`,
    {
      first: opts.first ?? 24,
      query: opts.query ?? "available_for_sale:true",
      sortKey: opts.sortKey ?? "CREATED_AT",
      reverse: opts.reverse ?? true,
    },
  );
  return data.products.edges.map((e) => e.node);
}

export async function fetchShopifyProductByHandle(handle: string): Promise<ShopifyProductNode | null> {
  const data = await storefrontQuery<{
    productByHandle: ShopifyProductNode | null;
  }>(
    `query Product($handle: String!) {
      productByHandle(handle: $handle) {
        ${PRODUCT_DETAIL_FRAGMENT}
      }
    }`,
    { handle },
  );
  return data.productByHandle;
}

export async function fetchShopifyProductsByCollection(handle: string, first = 48): Promise<ShopifyProductNode[]> {
  const data = await storefrontQuery<{
    collection: { products: { edges: { node: ShopifyProductNode }[] } } | null;
  }>(
    `query Collection($handle: String!, $first: Int!) {
      collection(handle: $handle) {
        products(first: $first) {
          edges { node { ${PRODUCT_CARD_FRAGMENT} } }
        }
      }
    }`,
    { handle, first },
  );
  return data.collection?.products.edges.map((e) => e.node) ?? [];
}

export async function searchShopifyProducts(term: string, first = 48): Promise<ShopifyProductNode[]> {
  const q = term.trim()
    ? `available_for_sale:true AND (title:*${term.trim()}* OR tag:${term.trim()} OR vendor:*${term.trim()}*)`
    : "available_for_sale:true";
  return fetchShopifyProducts({ first, query: q });
}

export async function countShopifyProducts(): Promise<number> {
  const list = await fetchShopifyProducts({ first: 250 });
  return list.length;
}

const COLLECTION_FRAGMENT = `
  id
  handle
  title
  description
  image { url }
`;

export async function fetchShopifyCollections(opts?: { first?: number }): Promise<ShopifyCollectionNode[]> {
  const data = await storefrontQuery<{
    collections: {
      edges: {
        node: {
          id: string;
          handle: string;
          title: string;
          description?: string | null;
          image?: { url: string } | null;
          products: { edges: { node: { id: string } }[] };
        };
      }[];
    };
  }>(
    `query Collections($first: Int!) {
      collections(first: $first) {
        edges {
          node {
            ${COLLECTION_FRAGMENT}
            products(first: 1) { edges { node { id } } }
          }
        }
      }
    }`,
    { first: opts?.first ?? 50 },
  );

  return data.collections.edges.map(({ node }) => ({
    id: node.id,
    handle: node.handle,
    title: node.title,
    description: node.description,
    image: node.image,
    productCount: node.products.edges.length,
  }));
}

export async function fetchShopifyCollectionByHandle(handle: string): Promise<ShopifyCollectionNode | null> {
  const data = await storefrontQuery<{
    collection: {
      id: string;
      handle: string;
      title: string;
      description?: string | null;
      image?: { url: string } | null;
      products: { edges: { node: { id: string } }[] };
    } | null;
  }>(
    `query Collection($handle: String!) {
      collection(handle: $handle) {
        ${COLLECTION_FRAGMENT}
        products(first: 1) { edges { node { id } } }
      }
    }`,
    { handle },
  );

  if (!data.collection) return null;
  return {
    ...data.collection,
    productCount: data.collection.products.edges.length,
  };
}
