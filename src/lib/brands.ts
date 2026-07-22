/** Category ranges & partner labels — display only, no fake OEM logos. */

export type TopBrand = {
  name: string;
  slug: string;
  tagline: string;
  accent: string;
};

export const STORE_TOP_BRANDS: TopBrand[] = [
  {
    name: "Kitchen & Home",
    slug: "kitchen-home",
    tagline: "We deal in this range",
    accent: "from-lime-500/20 to-emerald-600/10",
  },
  {
    name: "Daily Essentials",
    slug: "daily-essentials",
    tagline: "Curated range",
    accent: "from-primary/25 to-lime-500/10",
  },
  {
    name: "Unique Gadgets",
    slug: "unique-gadgets",
    tagline: "We deal in this range",
    accent: "from-amber-500/15 to-primary/10",
  },
  {
    name: "Home Organizers",
    slug: "home-organizers",
    tagline: "Partner catalogue",
    accent: "from-teal-500/15 to-primary/10",
  },
  {
    name: "Cleaning & Tools",
    slug: "cleaning-tools",
    tagline: "We deal in this range",
    accent: "from-sky-500/15 to-primary/10",
  },
  {
    name: "Storage & Holders",
    slug: "storage-holders",
    tagline: "Curated range",
    accent: "from-violet-500/15 to-primary/10",
  },
  {
    name: "Lifestyle Gadgets",
    slug: "lifestyle-gadgets",
    tagline: "Partner catalogue",
    accent: "from-orange-500/15 to-lime-500/10",
  },
  {
    name: "Pan-India Delivery",
    slug: "delivery",
    tagline: "Courier partners nationwide",
    accent: "from-primary/20 to-emerald-700/10",
  },
];

/** @deprecated use STORE_TOP_BRANDS */
export const CJ_TOP_BRANDS = STORE_TOP_BRANDS;

/** @deprecated */
export type StoreCollection = TopBrand & { category?: string; search?: string };
/** @deprecated */
export const STORE_COLLECTIONS = STORE_TOP_BRANDS;
/** @deprecated */
export const GADGET_BRANDS = STORE_TOP_BRANDS.map((b) => ({ name: b.name, slug: b.slug, logo: "📦" }));
