/** Copy & customize per project — see examples/gadgetvault.config.ts */

export type FlashSaleCategory = {
  slug: string;
  name: string;
};

export type FlashSaleTemplateConfig = {
  /** app_settings key */
  settingsKey?: string;
  /** Default section copy on homepage /deals */
  defaultTitle: string;
  defaultSubtitle: string;
  /** India pincode for CJ shipping estimate in admin */
  defaultPincode?: string;
  /** Product table select columns for storefront cards */
  productCardSelect: string;
  /** Admin nav label */
  adminNavLabel?: string;
  /** Route paths */
  adminRoutePath?: string;
  dealsRoutePath?: string;
  /** URL search param for flash sale product page (?deal=true) */
  dealSearchParam?: string;
};

export const DEFAULT_FLASH_SALE_CONFIG: FlashSaleTemplateConfig = {
  settingsKey: "flash_sale",
  defaultTitle: "Flash Sale",
  defaultSubtitle: "Limited-time offers on selected products",
  defaultPincode: "828404",
  productCardSelect:
    "id,name,slug,base_price,marketing_price,images,category,brand,is_bestseller,is_deal",
  adminNavLabel: "Flash Sale",
  adminRoutePath: "/admin/flash-sale",
  dealsRoutePath: "/deals",
  dealSearchParam: "deal",
};
