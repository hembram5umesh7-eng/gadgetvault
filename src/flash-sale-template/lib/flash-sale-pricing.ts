/** Standalone profit math — no CJ dependency */

export function profitFromSelling(totalCostInr: number, sellInr: number) {
  const profit = sellInr - totalCostInr;
  const marginPercent = sellInr > 0 ? Math.round((profit / sellInr) * 100) : 0;
  return { profit, marginPercent, isLoss: profit < 0 };
}

export function recommendSellingInr(totalCostInr: number, marginPercent: number): number {
  if (marginPercent >= 100) return totalCostInr * 2;
  return Math.ceil(totalCostInr / (1 - marginPercent / 100));
}

export function salePriceFromMarkup(costInr: number, markupPct: number): number {
  return Math.round(costInr * (1 + markupPct / 100));
}
