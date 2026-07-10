import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertStaffOrAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("staff")) throw new Error("Admin access required");
}

const validateInput = z.object({
  code: z.string().trim().min(2).max(32),
  subtotal: z.number().min(0),
  productIds: z.array(z.string().uuid()).min(1),
});

export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((input) => validateInput.parse(input))
  .handler(async ({ data }) => {
    const code = data.code.toUpperCase();
    const { data: coupon, error } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();

    if (error || !coupon) throw new Error("Invalid coupon code");

    const now = new Date();
    if (coupon.starts_at && new Date(coupon.starts_at) > now) throw new Error("Coupon not active yet");
    if (coupon.expires_at && new Date(coupon.expires_at) < now) throw new Error("Coupon expired");
    if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) throw new Error("Coupon usage limit reached");
    if (data.subtotal < Number(coupon.min_order_amount ?? 0)) {
      throw new Error(`Minimum order ${coupon.min_order_amount} required for this coupon`);
    }

    if (coupon.applies_to === "selected") {
      const { data: links } = await supabaseAdmin
        .from("coupon_products")
        .select("product_id")
        .eq("coupon_id", coupon.id);
      const allowed = new Set((links ?? []).map((l) => l.product_id));
      const eligible = data.productIds.filter((id) => allowed.has(id));
      if (!eligible.length) throw new Error("Coupon does not apply to items in your cart");
    }

    let discount = 0;
    if (coupon.discount_type === "percent") {
      discount = Math.round(data.subtotal * (Number(coupon.discount_value) / 100));
      if (coupon.max_discount != null) discount = Math.min(discount, Number(coupon.max_discount));
    } else {
      discount = Math.round(Number(coupon.discount_value));
    }
    discount = Math.min(discount, data.subtotal);

    return {
      code: coupon.code,
      discount,
      description: coupon.description ?? `${coupon.discount_type === "percent" ? coupon.discount_value + "%" : "₹" + coupon.discount_value} off`,
    };
  });

const createInput = z.object({
  code: z.string().trim().min(3).max(32),
  description: z.string().trim().max(200).optional(),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().min(0).default(0),
  maxDiscount: z.number().positive().optional(),
  appliesTo: z.enum(["all", "selected"]).default("all"),
  productIds: z.array(z.string().uuid()).optional(),
  usageLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const createCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);
    const code = data.code.toUpperCase();

    const { data: row, error } = await supabaseAdmin
      .from("coupons")
      .insert({
        code,
        description: data.description ?? null,
        discount_type: data.discountType,
        discount_value: data.discountValue,
        min_order_amount: data.minOrderAmount,
        max_discount: data.maxDiscount ?? null,
        applies_to: data.appliesTo,
        usage_limit: data.usageLimit ?? null,
        expires_at: data.expiresAt ?? null,
      })
      .select("id")
      .single();

    if (error || !row) throw new Error(error?.message ?? "Could not create coupon");

    if (data.appliesTo === "selected" && data.productIds?.length) {
      await supabaseAdmin.from("coupon_products").insert(
        data.productIds.map((product_id) => ({ coupon_id: row.id, product_id })),
      );
    }

    return { ok: true, id: row.id, code };
  });

export const listCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaffOrAdmin(context.userId);
    const { data } = await supabaseAdmin.from("coupons").select("*").order("created_at", { ascending: false });
    return { coupons: data ?? [] };
  });

const deleteInput = z.object({ id: z.string().uuid() });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deleteInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);
    const { error } = await supabaseAdmin.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);
    const { error } = await supabaseAdmin.from("coupons").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
