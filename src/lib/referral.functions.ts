import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  REFERRAL_SETTINGS_KEY,
  calcReferralDiscount,
  calcReferrerReward,
  parseReferralSettings,
  type ReferralSettings,
} from "@/lib/referral-settings";

async function assertStaffOrAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("staff")) throw new Error("Forbidden");
}

async function loadReferralSettings(): Promise<ReferralSettings> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", REFERRAL_SETTINGS_KEY)
    .maybeSingle();
  return parseReferralSettings(data?.value);
}

function randomCodePart(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function generateUniqueReferralCode(prefix: string): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = `${prefix}${randomCodePart(6)}`;
    const { data } = await supabaseAdmin.from("referral_codes").select("code").eq("code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Could not generate referral code");
}

export const getMyReferralInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const settings = await loadReferralSettings();

    let { data: codeRow } = await supabaseAdmin
      .from("referral_codes")
      .select("code, created_at")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!codeRow) {
      const code = await generateUniqueReferralCode(settings.codePrefix);
      const { data: inserted, error } = await supabaseAdmin
        .from("referral_codes")
        .insert({ user_id: context.userId, code })
        .select("code, created_at")
        .single();
      if (error) throw new Error(error.message);
      codeRow = inserted;
    }

    const { count: referralCount } = await supabaseAdmin
      .from("referral_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("referrer_user_id", context.userId);

    const { data: rewards } = await supabaseAdmin
      .from("referral_redemptions")
      .select("referrer_reward_coupon_code, referred_discount, created_at")
      .eq("referrer_user_id", context.userId)
      .not("referrer_reward_coupon_code", "is", null)
      .order("created_at", { ascending: false })
      .limit(5);

    return {
      settings,
      code: codeRow.code,
      referralCount: referralCount ?? 0,
      rewards: rewards ?? [],
    };
  });

const validateReferralInput = z.object({
  code: z.string().trim().min(4).max(20),
  subtotal: z.number().min(0),
});

export const validateReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => validateReferralInput.parse(input))
  .handler(async ({ data, context }) => {
    const settings = await loadReferralSettings();
    if (!settings.enabled) throw new Error("Referral program is currently off");

    const code = data.code.trim().toUpperCase();
    const { data: refRow } = await supabaseAdmin
      .from("referral_codes")
      .select("user_id, code")
      .eq("code", code)
      .maybeSingle();
    if (!refRow) throw new Error("Invalid referral code");

    if (refRow.user_id === context.userId) throw new Error("You cannot use your own referral code");

    const { data: existing } = await supabaseAdmin
      .from("referral_redemptions")
      .select("id")
      .eq("referred_user_id", context.userId)
      .maybeSingle();
    if (existing) throw new Error("Referral discount already used on a previous order");

    if (data.subtotal < settings.minOrderAmount) {
      throw new Error(`Minimum order ₹${settings.minOrderAmount} required for referral discount`);
    }

    const discount = calcReferralDiscount(data.subtotal, settings);
    if (discount <= 0) throw new Error("Referral discount not applicable for this order");

    return {
      code: refRow.code,
      discount,
      referrerUserId: refRow.user_id,
      description:
        settings.referredDiscountType === "percent"
          ? `${settings.referredDiscountValue}% referral discount`
          : `₹${settings.referredDiscountValue} referral discount`,
    };
  });

export const getPendingReferralDiscount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const settings = await loadReferralSettings();
    if (!settings.enabled) return { eligible: false as const };

    const { data: redeemed } = await supabaseAdmin
      .from("referral_redemptions")
      .select("id")
      .eq("referred_user_id", context.userId)
      .maybeSingle();
    if (redeemed) return { eligible: false as const };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("referred_by")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.referred_by) return { eligible: false as const };

    const { data: refCode } = await supabaseAdmin
      .from("referral_codes")
      .select("code")
      .eq("user_id", profile.referred_by)
      .maybeSingle();
    if (!refCode) return { eligible: false as const };

    return { eligible: true as const, code: refCode.code };
  });

const completeInput = z.object({
  orderId: z.string().uuid(),
  referralCode: z.string().trim().min(4).max(20),
  referredDiscount: z.number().int().min(0),
});

export const completeReferralOnOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => completeInput.parse(input))
  .handler(async ({ data, context }) => {
    if (data.referredDiscount <= 0) return { ok: true as const, skipped: true };

    const settings = await loadReferralSettings();
    const code = data.referralCode.trim().toUpperCase();

    const { data: refRow } = await supabaseAdmin
      .from("referral_codes")
      .select("user_id")
      .eq("code", code)
      .maybeSingle();
    if (!refRow || refRow.user_id === context.userId) return { ok: true as const, skipped: true };

    const { data: existing } = await supabaseAdmin
      .from("referral_redemptions")
      .select("id")
      .eq("referred_user_id", context.userId)
      .maybeSingle();
    if (existing) return { ok: true as const, skipped: true };

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, subtotal")
      .eq("id", data.orderId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!order) throw new Error("Order not found");

    const rewardAmount = calcReferrerReward(order.subtotal, settings);
    let rewardCouponCode: string | null = null;

    if (rewardAmount > 0) {
      rewardCouponCode = `RWD${randomCodePart(6)}`;
      const { error: couponErr } = await supabaseAdmin.from("coupons").insert({
        code: rewardCouponCode,
        description: `Referral reward — friend placed first order`,
        discount_type: "fixed",
        discount_value: rewardAmount,
        min_order_amount: settings.minOrderAmount,
        applies_to: "all",
        usage_limit: 1,
        active: true,
      });
      if (couponErr) rewardCouponCode = null;
    }

    const { error } = await supabaseAdmin.from("referral_redemptions").insert({
      referred_user_id: context.userId,
      referrer_user_id: refRow.user_id,
      referral_code: code,
      order_id: data.orderId,
      referred_discount: data.referredDiscount,
      referrer_reward_coupon_code: rewardCouponCode,
    });
    if (error) throw new Error(error.message);

    return { ok: true as const, rewardCouponCode };
  });

export async function attachReferralOnSignup(userId: string, referralCode?: string | null) {
  if (!referralCode?.trim()) return;
  const code = referralCode.trim().toUpperCase();
  const { data: refRow } = await supabaseAdmin
    .from("referral_codes")
    .select("user_id")
    .eq("code", code)
    .maybeSingle();
  if (!refRow || refRow.user_id === userId) return;

  await supabaseAdmin
    .from("profiles")
    .update({ referred_by: refRow.user_id })
    .eq("id", userId);
}

export const getReferralSettingsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaffOrAdmin(context.userId);
    const settings = await loadReferralSettings();

    const { count: totalReferrals } = await supabaseAdmin
      .from("referral_redemptions")
      .select("id", { count: "exact", head: true });

    const { count: totalCodes } = await supabaseAdmin
      .from("referral_codes")
      .select("user_id", { count: "exact", head: true });

    return { settings, totalReferrals: totalReferrals ?? 0, totalCodes: totalCodes ?? 0 };
  });

const saveSettingsInput = z.object({
  enabled: z.boolean(),
  referredDiscountType: z.enum(["percent", "fixed"]),
  referredDiscountValue: z.number().positive(),
  referrerRewardType: z.enum(["percent", "fixed"]),
  referrerRewardValue: z.number().positive(),
  maxReferredDiscount: z.number().min(0),
  maxReferrerReward: z.number().min(0),
  minOrderAmount: z.number().min(0),
  codePrefix: z.string().min(2).max(6),
});

export const saveReferralSettingsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => saveSettingsInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);
    const payload: ReferralSettings = {
      enabled: data.enabled,
      referredDiscountType: data.referredDiscountType,
      referredDiscountValue: data.referredDiscountValue,
      referrerRewardType: data.referrerRewardType,
      referrerRewardValue: data.referrerRewardValue,
      maxReferredDiscount: data.maxReferredDiscount,
      maxReferrerReward: data.maxReferrerReward,
      minOrderAmount: data.minOrderAmount,
      codePrefix: data.codePrefix.trim().toUpperCase(),
    };
    const { error } = await supabaseAdmin.from("app_settings").upsert({
      key: REFERRAL_SETTINGS_KEY,
      value: payload,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
