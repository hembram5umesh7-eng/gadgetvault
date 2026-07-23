import { isBrowsableCollection, normalizeCategorySlug } from "@/lib/shopify-categories";

/** Legacy navbar slugs — kept for backwards-compatible URLs and health checks */
export const NAV_CATEGORY_SLUGS = [
  "kitchen-accessories",
  "unique-gadgets",
  "necessities",
] as const;

export type NavCategorySlug = (typeof NAV_CATEGORY_SLUGS)[number];

export const NAV_CATEGORY_LABELS: Record<NavCategorySlug, string> = {
  "kitchen-accessories": "Kitchen Accessories",
  "unique-gadgets": "Unique Gadgets",
  necessities: "Necessities",
};

const COLLECTION_ALIASES: Record<NavCategorySlug, string[]> = {
  "kitchen-accessories": ["kitchen-accessories", "kitchen accessories", "kitchen"],
  "unique-gadgets": ["unique-gadgets", "unique gadgets", "gadgets"],
  necessities: ["necessities", "essentials", "essentials items"],
};

const KEYWORDS: Record<NavCategorySlug, string[]> = {
  "kitchen-accessories": ["kitchen", "organizer", "cookware", "utensil"],
  "unique-gadgets": ["gadget", "portable", "smart", "tech"],
  necessities: ["essential", "slipper", "daily", "home care"],
};

export type CategoryMatchInput = {
  title: string;
  tags?: string[];
  productType?: string | null;
  collectionHandles?: string[];
  collectionTitles?: string[];
};

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/\s+/g, "-")
    .replace(/[()]/g, "");
}

function tagCategorySlug(tags: string[] | undefined): string | null {
  for (const tag of tags ?? []) {
    const lower = tag.toLowerCase().trim();
    if (lower.startsWith("category:")) {
      const slug = lower.slice("category:".length).trim();
      if (slug) return normalizeKey(slug);
    }
  }
  return null;
}

/**
 * Primary category for a product — Shopify collection handle (auto, no manual mapping).
 * Falls back to legacy 3-category inference only when no collection is assigned.
 */
export function resolveProductCategorySlug(input: CategoryMatchInput): string {
  const fromTag = tagCategorySlug(input.tags);
  if (fromTag) return fromTag;

  for (const handle of input.collectionHandles ?? []) {
    if (isBrowsableCollection(handle)) return normalizeCategorySlug(handle);
  }

  for (const title of input.collectionTitles ?? []) {
    const slug = normalizeCategorySlug(title);
    if (isBrowsableCollection(slug)) return slug;
  }

  return inferLegacyNavCategory(input);
}

/** @deprecated use resolveProductCategorySlug — kept for health dashboard */
export function inferNavCategory(input: CategoryMatchInput): NavCategorySlug {
  const slug = resolveProductCategorySlug(input);
  if (isNavCategorySlug(slug)) return slug;
  return inferLegacyNavCategory(input);
}

function inferLegacyNavCategory(input: CategoryMatchInput): NavCategorySlug {
  for (const slug of NAV_CATEGORY_SLUGS) {
    if (matchesCollectionAliases(input, slug)) return slug;
  }

  const haystack = `${input.title} ${input.productType ?? ""} ${(input.tags ?? []).join(" ")}`.toLowerCase();
  let best: NavCategorySlug = "unique-gadgets";
  let bestScore = 0;

  for (const slug of NAV_CATEGORY_SLUGS) {
    let score = 0;
    for (const kw of KEYWORDS[slug]) {
      if (haystack.includes(kw)) score += kw.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = slug;
    }
  }

  return best;
}

function matchesCollectionAliases(input: CategoryMatchInput, slug: NavCategorySlug): boolean {
  const aliases = new Set(COLLECTION_ALIASES[slug].map(normalizeKey));
  for (const h of input.collectionHandles ?? []) {
    if (aliases.has(normalizeKey(h))) return true;
  }
  for (const t of input.collectionTitles ?? []) {
    if (aliases.has(normalizeKey(t))) return true;
  }
  return false;
}

export function isNavCategorySlug(value: string): value is NavCategorySlug {
  return (NAV_CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function productMatchesNavCategory(input: CategoryMatchInput, categorySlug: string): boolean {
  const productSlug = resolveProductCategorySlug(input);
  if (productSlug === categorySlug) return true;
  if (isNavCategorySlug(categorySlug)) {
    return inferLegacyNavCategory(input) === categorySlug || matchesCollectionAliases(input, categorySlug);
  }
  return false;
}

export function toCategoryMatchInput(node: {
  title: string;
  tags?: string[];
  productType?: string | null;
  collections?: { edges: { node: { handle: string; title: string } }[] };
}): CategoryMatchInput {
  return {
    title: node.title,
    tags: node.tags,
    productType: node.productType,
    collectionHandles: node.collections?.edges.map((e) => e.node.handle),
    collectionTitles: node.collections?.edges.map((e) => e.node.title),
  };
}
