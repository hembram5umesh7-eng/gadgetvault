import { profitFromSelling, recommendSellingInr } from "./flash-sale-pricing";

export const FLASH_SALE_KEY = "flash_sale";

export type FlashSaleSettings = {
  enabled: boolean;
  title: string;
  subtitle: string;
  categorySlugs: string[];
};

export type FlashSaleItemRow = {
  productId: string;
  salePrice: number;
  displayMrp: number | null;
};

export const DEFAULT_FLASH_SALE: FlashSaleSettings = {
  enabled: false,
  title: "Flash Sale",
  subtitle: "Limited-time offers on selected products",
  categorySlugs: [],
};

export function parseFlashSaleSettings(raw: unknown): FlashSaleSettings {
  const v = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const slugs = Array.isArray(v.categorySlugs)
    ? v.categorySlugs.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];
  return {
    enabled: Boolean(v.enabled),
    title: typeof v.title === "string" && v.title.trim() ? v.title.trim() : DEFAULT_FLASH_SALE.title,
    subtitle:
      typeof v.subtitle === "string" && v.subtitle.trim() ? v.subtitle.trim() : DEFAULT_FLASH_SALE.subtitle,
    categorySlugs: slugs,
  };
}

export const CJ_USD_INR_RATE = 85;

export function flashSaleLandedProfit(totalCostInr: number, salePrice: number) {
  const { profit, marginPercent, isLoss } = profitFromSelling(totalCostInr, salePrice);
  return { costInr: totalCostInr, profit, marginPct: marginPercent, isLoss };
}

export function salePriceFromLandedMargin(totalCostInr: number, marginPct: number): number {
  return recommendSellingInr(totalCostInr, marginPct);
}

export function flashSaleProfit(costUsd: number | null | undefined, salePrice: number, usdInr = CJ_USD_INR_RATE) {
  if (!costUsd || costUsd <= 0 || salePrice <= 0) {
    return { costInr: null as number | null, profit: null as number | null, marginPct: null as number | null, isLoss: false };
  }
  const costInr = Math.round(costUsd * usdInr);
  return { ...flashSaleLandedProfit(costInr, salePrice) };
}

export function salePriceFromMargin(costInr: number, marginPct: number): number {
  return salePriceFromLandedMargin(costInr, marginPct);
}
