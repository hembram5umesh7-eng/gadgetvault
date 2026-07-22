import type { FlashSaleSettings } from "../lib/flash-sale-settings";

export type FlashSaleAdminProduct = {
  id: string;
  name: string;
  slug: string;
  category: string;
  base_price: number;
  marketing_price: number | null;
  cj_cost_usd: number | null;
  cj_product_id: string | null;
  fulfillment_source: string;
  images: string[] | null;
  inFlashSale: boolean;
  salePrice: number;
  displayMrp: number | null;
};

export type FlashSaleSavePayload = {
  enabled: boolean;
  title: string;
  subtitle: string;
  categorySlugs: string[];
  items: { productId: string; salePrice: number; displayMrp: number | null }[];
};

export type LandedCostEstimate = {
  totalCostInr: number;
  selectedShipping?: { logisticPriceUsd: number } | null;
  preview?: { profit: number; marginPercent: number; isLoss: boolean };
  shippingIsEstimate?: boolean;
};

export type FlashSaleProfitPanelProps = {
  storeProductId: string;
  productName: string;
  sellOverride: string;
  mrpOverride: string;
  pincode: string;
  logisticName: string;
  onPincodeChange: (v: string) => void;
  onLogisticChange: (v: string) => void;
  applyLabel?: string;
  onApply: (sell: number, mrp: number) => void;
};

export type FlashSaleAdminLoadResult = {
  settings: FlashSaleSettings;
  catalog: FlashSaleAdminProduct[];
  itemCount?: number;
};
