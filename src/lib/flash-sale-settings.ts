export {
  FLASH_SALE_KEY,
  DEFAULT_FLASH_SALE,
  parseFlashSaleSettings,
  flashSaleLandedProfit,
  salePriceFromLandedMargin,
  flashSaleProfit,
  salePriceFromMargin,
  salePriceFromMarkup,
} from "@flash-sale-template";
export type { FlashSaleSettings, FlashSaleItemRow } from "@flash-sale-template";

/** USD → INR (project env override) */
export const CJ_USD_INR_RATE = Number(import.meta.env.VITE_CJ_USD_INR || import.meta.env.CJ_USD_INR || 85);
