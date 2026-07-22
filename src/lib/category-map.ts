/** Navbar category slugs — must match SiteHeader + category routes */

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

/** Shopify collection handles/titles that map to each navbar category */
const COLLECTION_ALIASES: Record<NavCategorySlug, string[]> = {
  "kitchen-accessories": [
    "kitchen-accessories",
    "kitchen accessories",
    "kitchen",
  ],
  "unique-gadgets": [
    "unique-gadgets",
    "unique gadgets",
    "unique-essentials-gadgets",
    "unique essentials (gadgets)",
    "unique essentials gadgets",
    "gadgets",
  ],
  necessities: [
    "necessities",
    "essentials-item-s",
    "essentials items",
    "essentials item's",
    "essentials",
  ],
};

const PRODUCT_TYPE_CATEGORY: Record<string, NavCategorySlug> = {
  iron: "kitchen-accessories",
  "kitchen tool sets": "kitchen-accessories",
  slippers: "necessities",
  "dishwasher racks": "kitchen-accessories",
};

const KEYWORDS: Record<NavCategorySlug, string[]> = {
  "kitchen-accessories": [
    "kitchen",
    "cupboard",
    "organizer",
    "organiser",
    "drawer",
    "pegboard",
    "dishwasher",
    "dish rack",
    "cookware",
    "cooking",
    "utensil",
    "iron",
    "steam iron",
    "ironing",
    "tool set",
    "kitchen tool",
    "tray",
  ],
  "unique-gadgets": [
    "gadget",
    "unique",
    "portable",
    "handheld",
    "cross-border",
    "folding",
    "mini",
    "smart",
    "tech",
    "electronic",
  ],
  necessities: [
    "necessit",
    "essential",
    "slipper",
    "slippers",
    "sandal",
    "sandals",
    "footwear",
    "bath",
    "daily",
    "home care",
    "cleaning",
    "bathroom",
  ],
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

/** Map Shopify product → navbar category (auto — no manual tags required) */
export function inferNavCategory(input: CategoryMatchInput): NavCategorySlug {
  for (const slug of NAV_CATEGORY_SLUGS) {
    if (matchesCollectionAliases(input, slug)) return slug;
  }

  const tags = (input.tags ?? []).map((t) => t.toLowerCase());
  const normalizedTags = tags.map(normalizeKey);

  for (const slug of NAV_CATEGORY_SLUGS) {
    if (normalizedTags.includes(slug)) return slug;
    if (normalizedTags.includes(normalizeKey(NAV_CATEGORY_LABELS[slug]))) return slug;
    if (tags.includes(slug.replace(/-/g, " "))) return slug;
  }

  const productType = (input.productType ?? "").trim().toLowerCase();
  if (productType && PRODUCT_TYPE_CATEGORY[productType]) {
    return PRODUCT_TYPE_CATEGORY[productType];
  }

  const haystack = `${input.title} ${input.productType ?? ""} ${tags.join(" ")}`.toLowerCase();

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

export function productMatchesNavCategory(input: CategoryMatchInput, categorySlug: string): boolean {
  if (!isNavCategorySlug(categorySlug)) return false;
  if (matchesCollectionAliases(input, categorySlug)) return true;
  return inferNavCategory(input) === categorySlug;
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
