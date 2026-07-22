/**
 * Copy to: src/lib/flash-sale.functions.ts
 * Customize auth (assertStaffOrAdmin) and product columns for your schema.
 */
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

async function assertStaffOrAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("staff")) throw new Error("Forbidden");
}

export const getFlashSaleAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaffOrAdmin(context.userId);
    // ... same handler body as your project — see design-stitch/src/lib/flash-sale.functions.ts
  });

export const saveFlashSaleAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => saveInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);
    // ... same save logic
  });

const saveInput = z.object({
  enabled: z.boolean(),
  title: z.string().min(1).max(80),
  subtitle: z.string().min(1).max(200),
  categorySlugs: z.array(z.string().min(1)),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      salePrice: z.number().int().positive(),
      displayMrp: z.number().int().positive().nullable().optional(),
    }),
  ),
});
