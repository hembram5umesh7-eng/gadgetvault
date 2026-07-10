/** CJ landed cost + selling price / profit helpers */

export interface CJLogisticsOption {
  logisticName: string;
  logisticPriceUsd: number;
  logisticAging: string;
}

export function usdToInr(usd: number, rate = Number(process.env.CJ_USD_INR ?? 85)): number {
  return Math.ceil(Math.max(0, usd) * rate);
}

/** Total cost you pay CJ (product + shipping), in INR */
export function cjLandedCostInr(productCostUsd: number, shippingUsd: number, rate?: number): number {
  return usdToInr(productCostUsd + shippingUsd, rate);
}

/** Selling price needed for target profit margin on selling price: margin = (sell - cost) / sell */
export function recommendSellingInr(totalCostInr: number, marginPercent: number): number {
  if (marginPercent >= 100) return totalCostInr * 2;
  return Math.ceil(totalCostInr / (1 - marginPercent / 100));
}

export function profitFromSelling(totalCostInr: number, sellInr: number) {
  const profit = sellInr - totalCostInr;
  const marginPercent = sellInr > 0 ? Math.round((profit / sellInr) * 100) : 0;
  return { profit, marginPercent, isLoss: profit < 0 };
}

export function pickLogisticsOption(
  options: CJLogisticsOption[],
  preferredName?: string,
): CJLogisticsOption | null {
  if (!options.length) return null;
  const pref = preferredName?.trim();
  if (pref) {
    const match = options.find(
      (o) => o.logisticName === pref || o.logisticName.includes(pref) || pref.includes(o.logisticName),
    );
    if (match) return match;
  }
  return [...options].sort((a, b) => a.logisticPriceUsd - b.logisticPriceUsd)[0];
}

export interface CJProfitEstimate {
  productName: string;
  variantCount: number;
  productCostUsd: number;
  productCostInr: number;
  shippingOptions: CJLogisticsOption[];
  selectedShipping: CJLogisticsOption;
  totalCostUsd: number;
  totalCostInr: number;
  usdInrRate: number;
  recommendations: Array<{ marginPercent: number; sellInr: number; profitInr: number; mrpInr: number }>;
  highShippingWarning: boolean;
}

export function buildProfitEstimate(params: {
  productName: string;
  variantCount: number;
  productCostUsd: number;
  shippingOptions: CJLogisticsOption[];
  preferredLogistic?: string;
  marginTargets?: number[];
  usdInrRate?: number;
}): CJProfitEstimate {
  const rate = params.usdInrRate ?? Number(process.env.CJ_USD_INR ?? 85);
  const selected =
    pickLogisticsOption(params.shippingOptions, params.preferredLogistic) ??
    params.shippingOptions[0];
  const productCostInr = usdToInr(params.productCostUsd, rate);
  const shippingInr = usdToInr(selected?.logisticPriceUsd ?? 0, rate);
  const totalCostInr = productCostInr + shippingInr;
  const totalCostUsd = params.productCostUsd + (selected?.logisticPriceUsd ?? 0);
  const margins = params.marginTargets ?? [30, 40, 50];

  return {
    productName: params.productName,
    variantCount: params.variantCount,
    productCostUsd: params.productCostUsd,
    productCostInr,
    shippingOptions: params.shippingOptions,
    selectedShipping: selected,
    totalCostUsd,
    totalCostInr,
    usdInrRate: rate,
    recommendations: margins.map((m) => {
      const sellInr = recommendSellingInr(totalCostInr, m);
      const { profit } = profitFromSelling(totalCostInr, sellInr);
      return { marginPercent: m, sellInr, profitInr: profit, mrpInr: Math.ceil(sellInr * 1.3) };
    }),
    highShippingWarning: (selected?.logisticPriceUsd ?? 0) > params.productCostUsd * 1.5,
  };
}
