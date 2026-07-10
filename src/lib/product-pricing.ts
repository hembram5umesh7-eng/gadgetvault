/** Shared product pricing helpers — always use DB marketing_price when set. */
export function productMrp(basePrice: number, marketingPrice?: number | null): number {
  if (marketingPrice != null && marketingPrice > basePrice) return Math.round(marketingPrice);
  return Math.round(basePrice * 1.45);
}

export function productDiscountPercent(basePrice: number, marketingPrice?: number | null): number {
  const mrp = productMrp(basePrice, marketingPrice);
  if (mrp <= basePrice) return 0;
  return Math.round((1 - basePrice / mrp) * 100);
}

export const PRODUCT_CARD_SELECT =
  "id,name,slug,base_price,marketing_price,images,category,brand,is_bestseller,is_deal";
