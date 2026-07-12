import { supabase } from "@/integrations/supabase/client";
import type { ProductCardData } from "@/components/product-card";
import { PRODUCT_CARD_SELECT } from "@/lib/product-pricing";
import {
  FLASH_SALE_KEY,
  parseFlashSaleSettings,
  type FlashSaleSettings,
} from "@/lib/flash-sale-settings";

export type FlashSaleCatalog = {
  settings: FlashSaleSettings;
  products: ProductCardData[];
};

export async function fetchFlashSaleCatalog(): Promise<FlashSaleCatalog> {
  const [{ data: settingsRow }, { data: items }] = await Promise.all([
    supabase.from("app_settings").select("value").eq("key", FLASH_SALE_KEY).maybeSingle(),
    supabase.from("flash_sale_items").select("product_id, sale_price, display_mrp"),
  ]);

  const settings = parseFlashSaleSettings(settingsRow?.value);
  if (!settings.enabled) {
    return { settings, products: [] };
  }

  if (!settings.enabled || !items?.length) {
    return { settings, products: [] };
  }

  const itemMap = new Map(
    items.map((i) => [
      i.product_id,
      { salePrice: i.sale_price as number, displayMrp: i.display_mrp as number | null },
    ]),
  );

  const productIds = [...itemMap.keys()];
  const { data: products } = await supabase
    .from("products")
    .select(PRODUCT_CARD_SELECT)
    .eq("active", true)
    .in("id", productIds)
    .order("created_at", { ascending: false });

  const list = (products as ProductCardData[]) ?? [];
  const filtered = list.map((p) => {
    const row = itemMap.get(p.id)!;
    return {
      ...p,
      base_price: row.salePrice,
      marketing_price: row.displayMrp ?? p.marketing_price,
      is_deal: true,
    };
  });

  return { settings, products: filtered };
}

export async function fetchFlashSalePrice(productId: string): Promise<{
  active: boolean;
  salePrice: number | null;
  displayMrp: number | null;
}> {
  const [{ data: settingsRow }, { data: item }] = await Promise.all([
    supabase.from("app_settings").select("value").eq("key", FLASH_SALE_KEY).maybeSingle(),
    supabase.from("flash_sale_items").select("sale_price, display_mrp").eq("product_id", productId).maybeSingle(),
  ]);

  const settings = parseFlashSaleSettings(settingsRow?.value);
  if (!settings.enabled || !item) return { active: false, salePrice: null, displayMrp: null };

  return {
    active: true,
    salePrice: item.sale_price as number,
    displayMrp: item.display_mrp as number | null,
  };
}
