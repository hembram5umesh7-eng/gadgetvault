import { supabase } from "@/integrations/supabase/client";
import type { ProductCardData } from "@/components/product-card";
import { fetchProductsByHandles } from "@/lib/products";
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
    supabase.from("flash_sale_items").select("product_handle, product_id, sale_price, display_mrp"),
  ]);

  const settings = parseFlashSaleSettings(settingsRow?.value);
  if (!settings.enabled || !items?.length) {
    return { settings, products: [] };
  }

  const itemMap = new Map(
    items.map((i) => [
      (i.product_handle as string) || String(i.product_id),
      { salePrice: i.sale_price as number, displayMrp: i.display_mrp as number | null },
    ]),
  );

  const handles = [...itemMap.keys()].filter(Boolean);
  const products = await fetchProductsByHandles(handles);

  const filtered = products.map((p) => {
    const row = itemMap.get(p.slug)!;
    if (!row) return p;
    return {
      ...p,
      base_price: row.salePrice,
      marketing_price: row.displayMrp ?? p.marketing_price,
      is_deal: true,
    };
  });

  return { settings, products: filtered.filter((p) => itemMap.has(p.slug)) };
}

export async function fetchFlashSalePrice(productSlug: string): Promise<{
  active: boolean;
  salePrice: number | null;
  displayMrp: number | null;
}> {
  const [{ data: settingsRow }, { data: item }] = await Promise.all([
    supabase.from("app_settings").select("value").eq("key", FLASH_SALE_KEY).maybeSingle(),
    supabase
      .from("flash_sale_items")
      .select("sale_price, display_mrp")
      .eq("product_handle", productSlug)
      .maybeSingle(),
  ]);

  const settings = parseFlashSaleSettings(settingsRow?.value);
  if (!settings.enabled || !item) return { active: false, salePrice: null, displayMrp: null };

  return {
    active: true,
    salePrice: item.sale_price as number,
    displayMrp: item.display_mrp as number | null,
  };
}

export type { FlashSaleSettings };
