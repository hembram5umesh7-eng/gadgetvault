import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FLASH_SALE_KEY,
  parseFlashSaleSettings,
  type FlashSaleSettings,
} from "./flash-sale-settings";

/** Minimal product shape for flash sale cards — extend via generic T */
export type FlashSaleProductBase = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  marketing_price: number | null;
  images: string[] | null;
  category: string;
  is_deal?: boolean;
  [key: string]: unknown;
};

export type FlashSaleCatalog<T extends FlashSaleProductBase = FlashSaleProductBase> = {
  settings: FlashSaleSettings;
  products: T[];
};

export type FlashSaleClient = {
  fetchFlashSaleCatalog: <T extends FlashSaleProductBase>() => Promise<FlashSaleCatalog<T>>;
  fetchFlashSalePrice: (productId: string) => Promise<{
    active: boolean;
    salePrice: number | null;
    displayMrp: number | null;
  }>;
};

export function createFlashSaleClient(
  supabase: SupabaseClient,
  productSelect: string,
  settingsKey = FLASH_SALE_KEY,
): FlashSaleClient {
  async function fetchFlashSaleCatalog<T extends FlashSaleProductBase>(): Promise<FlashSaleCatalog<T>> {
    const [{ data: settingsRow }, { data: items }] = await Promise.all([
      supabase.from("app_settings").select("value").eq("key", settingsKey).maybeSingle(),
      supabase.from("flash_sale_items").select("product_id, sale_price, display_mrp"),
    ]);

    const settings = parseFlashSaleSettings(settingsRow?.value);
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
      .select(productSelect)
      .eq("active", true)
      .in("id", productIds)
      .order("created_at", { ascending: false });

    const list = (products as T[]) ?? [];
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

  async function fetchFlashSalePrice(productId: string) {
    const [{ data: settingsRow }, { data: item }] = await Promise.all([
      supabase.from("app_settings").select("value").eq("key", settingsKey).maybeSingle(),
      supabase
        .from("flash_sale_items")
        .select("sale_price, display_mrp")
        .eq("product_id", productId)
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

  return { fetchFlashSaleCatalog, fetchFlashSalePrice };
}
