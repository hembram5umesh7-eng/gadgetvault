// Flash Sale Template — public exports

export { AdminFlashSalePanel } from "./components/AdminFlashSalePanel";
export type { AdminFlashSalePanelProps } from "./components/AdminFlashSalePanel";

export {
  FLASH_SALE_KEY,
  DEFAULT_FLASH_SALE,
  parseFlashSaleSettings,
  flashSaleLandedProfit,
  salePriceFromLandedMargin,
  flashSaleProfit,
  salePriceFromMargin,
  CJ_USD_INR_RATE,
} from "./lib/flash-sale-settings";
export type { FlashSaleSettings, FlashSaleItemRow } from "./lib/flash-sale-settings";

export { profitFromSelling, recommendSellingInr, salePriceFromMarkup } from "./lib/flash-sale-pricing";

export { createFlashSaleClient } from "./lib/flash-sale-client";
export type {
  FlashSaleClient,
  FlashSaleCatalog,
  FlashSaleProductBase,
} from "./lib/flash-sale-client";

export { cn } from "./lib/cn";

export type { FlashSaleTemplateConfig, FlashSaleCategory } from "./types/flash-sale-template-config";
export { DEFAULT_FLASH_SALE_CONFIG } from "./types/flash-sale-template-config";

export type {
  FlashSaleAdminProduct,
  FlashSaleSavePayload,
  LandedCostEstimate,
  FlashSaleProfitPanelProps,
  FlashSaleAdminLoadResult,
} from "./types/flash-sale-admin";
