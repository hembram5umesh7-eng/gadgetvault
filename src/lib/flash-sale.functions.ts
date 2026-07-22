import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  FLASH_SALE_KEY,
  parseFlashSaleSettings,
  type FlashSaleSettings,
} from "@flash-sale-template";
import type { FlashSaleAdminProduct } from "@flash-sale-template";
import { fetchShopifyProducts } from "@/integrations/shopify/storefront";
import { mapProductCard } from "@/integrations/shopify/product-mapper";

async function assertStaffOrAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("staff")) throw new Error("Forbidden");
}

export const getFlashSaleAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaffOrAdmin(context.userId);

    const [{ data: settingsRow }, { data: items }, shopifyNodes] = await Promise.all([
      supabaseAdmin.from("app_settings").select("value").eq("key", FLASH_SALE_KEY).maybeSingle(),
      supabaseAdmin.from("flash_sale_items").select("product_id, product_handle, sale_price, display_mrp"),
      fetchShopifyProducts({ first: 100, query: "available_for_sale:true" }),
    ]);

    const settings = parseFlashSaleSettings(settingsRow?.value);
    const itemMap = new Map(
      (items ?? []).map((i) => [
        (i.product_handle as string) || String(i.product_id),
        { salePrice: i.sale_price, displayMrp: i.display_mrp as number | null },
      ]),
    );

    const inCategory = (category: string) => settings.categorySlugs.includes(category);

    const catalog: FlashSaleAdminProduct[] = shopifyNodes.map((node) => {
      const card = mapProductCard(node);
      const row = itemMap.get(card.slug);
      const included = Boolean(row) || inCategory(card.category);
      return {
        id: card.id,
        name: card.name,
        slug: card.slug,
        category: card.category,
        base_price: card.base_price,
        marketing_price: card.marketing_price,
        cj_cost_usd: null,
        cj_product_id: null,
        fulfillment_source: "shopify",
        images: card.images,
        inFlashSale: included,
        salePrice: row?.salePrice ?? card.base_price,
        displayMrp: row?.displayMrp ?? card.marketing_price,
      };
    });

    return { settings, catalog, itemCount: itemMap.size };
  });

const saveItemSchema = z.object({
  productId: z.string().min(1),
  salePrice: z.number().int().positive(),
  displayMrp: z.number().int().positive().nullable().optional(),
});

const saveInput = z.object({
  enabled: z.boolean(),
  title: z.string().min(1).max(80),
  subtitle: z.string().min(1).max(200),
  categorySlugs: z.array(z.string().min(1)),
  items: z.array(saveItemSchema),
});

export const saveFlashSaleAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => saveInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);

    const settings: FlashSaleSettings = {
      enabled: data.enabled,
      title: data.title.trim(),
      subtitle: data.subtitle.trim(),
      categorySlugs: data.categorySlugs,
    };

    const { error: settingsErr } = await supabaseAdmin.from("app_settings").upsert({
      key: FLASH_SALE_KEY,
      value: settings,
      updated_at: new Date().toISOString(),
    });
    if (settingsErr) throw new Error(settingsErr.message);

    const shopifyNodes = await fetchShopifyProducts({ first: 100, query: "available_for_sale:true" });
    const slugById = new Map(shopifyNodes.map((n) => [n.id, n.handle]));

    await supabaseAdmin.from("flash_sale_items").delete().neq("product_id", "00000000-0000-0000-0000-000000000000");

    if (settings.enabled && data.items.length > 0) {
      const rows = data.items.map((item) => ({
        product_id: item.productId,
        product_handle: slugById.get(item.productId) ?? item.productId,
        sale_price: item.salePrice,
        display_mrp: item.displayMrp ?? null,
        updated_at: new Date().toISOString(),
      }));

      const { error: itemsErr } = await supabaseAdmin.from("flash_sale_items").upsert(rows);
      if (itemsErr) throw new Error(itemsErr.message);
    }

    return { ok: true as const, productCount: data.items.length };
  });
