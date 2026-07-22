import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SETTINGS_KEY = "razorpay";

type RazorpaySettings = {
  key_id?: string | null;
  key_secret?: string | null;
  webhook_secret?: string | null;
  updated_at?: string | null;
};

async function readSettings(): Promise<RazorpaySettings> {
  const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
  return (data?.value as RazorpaySettings) ?? {};
}

async function writeSettings(patch: Partial<RazorpaySettings>): Promise<void> {
  const current = await readSettings();
  const { error } = await supabaseAdmin.from("app_settings").upsert({
    key: SETTINGS_KEY,
    value: { ...current, ...patch, updated_at: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function getStoredRazorpayKeyId(): Promise<string | null> {
  return (await readSettings()).key_id?.trim() || null;
}

export async function getStoredRazorpayKeySecret(): Promise<string | null> {
  return (await readSettings()).key_secret?.trim() || null;
}

export async function saveStoredRazorpayKeys(keyId: string, keySecret: string): Promise<void> {
  const id = keyId.trim();
  const secret = keySecret.trim();
  if (!id.startsWith("rzp_")) throw new Error("Key ID should start with rzp_test_ or rzp_live_");
  if (secret.length < 20) throw new Error("Invalid key secret");
  await writeSettings({ key_id: id, key_secret: secret });
}

export async function getStoredRazorpayWebhookSecret(): Promise<string | null> {
  return (await readSettings()).webhook_secret?.trim() || null;
}

export async function saveStoredRazorpayWebhookSecret(secret: string): Promise<void> {
  const trimmed = secret.trim();
  if (trimmed.length < 8) throw new Error("Invalid webhook secret");
  await writeSettings({ webhook_secret: trimmed });
}

export async function resolveRazorpayWebhookSecret(): Promise<string | null> {
  return process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || (await getStoredRazorpayWebhookSecret());
}

export async function resolveRazorpayKeyId(): Promise<string | null> {
  return process.env.RAZORPAY_KEY_ID?.trim() || (await getStoredRazorpayKeyId());
}

export async function resolveRazorpayKeySecret(): Promise<string | null> {
  return process.env.RAZORPAY_KEY_SECRET?.trim() || (await getStoredRazorpayKeySecret());
}

export async function razorpayConfigured(): Promise<boolean> {
  const id = await resolveRazorpayKeyId();
  const secret = await resolveRazorpayKeySecret();
  return Boolean(id && secret);
}
