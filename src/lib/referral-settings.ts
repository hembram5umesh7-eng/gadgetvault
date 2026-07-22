export const REFERRAL_SETTINGS_KEY = "referral_settings";

export type ReferralDiscountType = "percent" | "fixed";

export type ReferralSettings = {
  enabled: boolean;
  referredDiscountType: ReferralDiscountType;
  referredDiscountValue: number;
  referrerRewardType: ReferralDiscountType;
  referrerRewardValue: number;
  maxReferredDiscount: number;
  maxReferrerReward: number;
  minOrderAmount: number;
  codePrefix: string;
};

export const DEFAULT_REFERRAL_SETTINGS: ReferralSettings = {
  enabled: true,
  referredDiscountType: "percent",
  referredDiscountValue: 10,
  referrerRewardType: "percent",
  referrerRewardValue: 5,
  maxReferredDiscount: 500,
  maxReferrerReward: 300,
  minOrderAmount: 499,
  codePrefix: "GV",
};

export function parseReferralSettings(raw: unknown): ReferralSettings {
  const v = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const type = (t: unknown, fallback: ReferralDiscountType): ReferralDiscountType =>
    t === "fixed" ? "fixed" : fallback;

  return {
    enabled: v.enabled !== false,
    referredDiscountType: type(v.referredDiscountType, DEFAULT_REFERRAL_SETTINGS.referredDiscountType),
    referredDiscountValue: num(v.referredDiscountValue, DEFAULT_REFERRAL_SETTINGS.referredDiscountValue),
    referrerRewardType: type(v.referrerRewardType, DEFAULT_REFERRAL_SETTINGS.referrerRewardType),
    referrerRewardValue: num(v.referrerRewardValue, DEFAULT_REFERRAL_SETTINGS.referrerRewardValue),
    maxReferredDiscount: num(v.maxReferredDiscount, DEFAULT_REFERRAL_SETTINGS.maxReferredDiscount),
    maxReferrerReward: num(v.maxReferrerReward, DEFAULT_REFERRAL_SETTINGS.maxReferrerReward),
    minOrderAmount: num(v.minOrderAmount, DEFAULT_REFERRAL_SETTINGS.minOrderAmount),
    codePrefix:
      typeof v.codePrefix === "string" && v.codePrefix.trim()
        ? v.codePrefix.trim().toUpperCase().slice(0, 6)
        : DEFAULT_REFERRAL_SETTINGS.codePrefix,
  };
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function calcReferralDiscount(subtotal: number, settings: ReferralSettings): number {
  if (!settings.enabled || subtotal < settings.minOrderAmount) return 0;
  let discount = 0;
  if (settings.referredDiscountType === "percent") {
    discount = Math.round(subtotal * (settings.referredDiscountValue / 100));
    discount = Math.min(discount, settings.maxReferredDiscount);
  } else {
    discount = Math.round(settings.referredDiscountValue);
  }
  return Math.min(discount, subtotal);
}

export function calcReferrerReward(orderSubtotal: number, settings: ReferralSettings): number {
  if (!settings.enabled) return 0;
  let reward = 0;
  if (settings.referrerRewardType === "percent") {
    reward = Math.round(orderSubtotal * (settings.referrerRewardValue / 100));
    reward = Math.min(reward, settings.maxReferrerReward);
  } else {
    reward = Math.round(settings.referrerRewardValue);
  }
  return Math.max(0, reward);
}

export const REFERRAL_STORAGE_KEY = "gv-ref-code";

export function saveReferralCodeToStorage(code: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(REFERRAL_STORAGE_KEY, code.trim().toUpperCase());
}

export function getReferralCodeFromStorage(): string | null {
  if (typeof localStorage === "undefined") return null;
  const v = localStorage.getItem(REFERRAL_STORAGE_KEY);
  return v?.trim() ? v.trim().toUpperCase() : null;
}

export function clearReferralCodeFromStorage() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
}
