import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  FLASH_SALE_KEY,
  parseFlashSaleSettings,
  type FlashSaleSettings,
} from "@/lib/flash-sale-settings";

async function assertStaffOrAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("staff")) throw new Error("Forbidden");
}

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

export const getFlashSaleAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaffOrAdmin(context.userId);

    const [{ data: settingsRow }, { data: items }, { data: products }] = await Promise.all([
      supabaseAdmin.from("app_settings").select("value").eq("key", FLASH_SALE_KEY).maybeSingle(),
      supabaseAdmin.from("flash_sale_items").select("product_id, sale_price, display_mrp"),
      supabaseAdmin
        .from("products")
        .select("id, name, slug, category, base_price, marketing_price, cj_cost_usd, cj_product_id, fulfillment_source, images, active")
        .eq("active", true)
        .order("name"),
    ]);

    const settings = parseFlashSaleSettings(settingsRow?.value);
    const itemMap = new Map(
      (items ?? []).map((i) => [
        i.product_id,
        { salePrice: i.sale_price, displayMrp: i.display_mrp as number | null },
      ]),
    );

    const inCategory = (category: string) => settings.categorySlugs.includes(category);

    const catalog: FlashSaleAdminProduct[] = (products ?? []).map((p) => {
      const row = itemMap.get(p.id);
      const included = Boolean(row) || inCategory(p.category);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        category: p.category,
        base_price: p.base_price,
        marketing_price: p.marketing_price,
        cj_cost_usd: p.cj_cost_usd,
        cj_product_id: p.cj_product_id,
        fulfillment_source: p.fulfillment_source ?? "local",
        images: p.images,
        inFlashSale: included,
        salePrice: row?.salePrice ?? p.base_price,
        displayMrp: row?.displayMrp ?? p.marketing_price,
      };
    });

    return { settings, catalog, itemCount: itemMap.size };
  });

const saveItemSchema = z.object({
  productId: z.string().uuid(),
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

    const itemMap = new Map(data.items.map((i) => [i.productId, i]));

    const flashProductIds = new Set<string>();
    if (settings.enabled) {
      for (const [pid] of itemMap) flashProductIds.add(pid);
    }

    await supabaseAdmin.from("flash_sale_items").delete().neq("product_id", "00000000-0000-0000-0000-000000000000");

    if (flashProductIds.size > 0) {
      const rows = [...itemMap.entries()]
        .filter(([pid]) => flashProductIds.has(pid))
        .map(([productId, item]) => ({
          product_id: productId,
          sale_price: item.salePrice,
          display_mrp: item.displayMrp ?? null,
          updated_at: new Date().toISOString(),
        }));

      const { error: itemsErr } = await supabaseAdmin.from("flash_sale_items").upsert(rows);
      if (itemsErr) throw new Error(itemsErr.message);
    }

    const { data: allProducts } = await supabaseAdmin.from("products").select("id");
    const updates = (allProducts ?? []).map((p) => ({
      id: p.id,
      is_deal: settings.enabled && flashProductIds.has(p.id),
    }));

    for (const batch of chunk(updates, 50)) {
      await Promise.all(
        batch.map((u) => supabaseAdmin.from("products").update({ is_deal: u.is_deal }).eq("id", u.id)),
      );
    }

    return { ok: true as const, productCount: flashProductIds.size };
  });

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
