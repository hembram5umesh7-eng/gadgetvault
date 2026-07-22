import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SETTINGS_KEY = "shopify_admin";

export type ShopifyAdminSettings = {
  access_token?: string | null;
  client_secret?: string | null;
  automation_token?: string | null;
  scope?: string | null;
  connected_at?: string | null;
  updated_at?: string | null;
};

async function readSettings(): Promise<ShopifyAdminSettings> {
  const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
  return (data?.value as ShopifyAdminSettings) ?? {};
}

async function writeSettings(patch: Partial<ShopifyAdminSettings>): Promise<void> {
  const current = await readSettings();
  const { error } = await supabaseAdmin.from("app_settings").upsert({
    key: SETTINGS_KEY,
    value: { ...current, ...patch, updated_at: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function getStoredShopifyAdminToken(): Promise<string | null> {
  const token = (await readSettings()).access_token?.trim();
  return token || null;
}

export async function getStoredShopifyClientSecret(): Promise<string | null> {
  const secret = (await readSettings()).client_secret?.trim();
  return secret || null;
}

export async function saveStoredShopifyAdminToken(token: string): Promise<void> {
  const trimmed = token.trim();
  if (trimmed.length < 20) throw new Error("Invalid token");
  await writeSettings({ access_token: trimmed, connected_at: new Date().toISOString() });
}

export async function saveStoredShopifyClientSecret(secret: string): Promise<void> {
  const trimmed = secret.trim();
  if (!trimmed.startsWith("shpss_") && !trimmed.startsWith("shpat_")) {
    throw new Error("Invalid client secret — should start with shpss_");
  }
  await writeSettings({ client_secret: trimmed });
}

export async function saveStoredShopifyAutomationToken(token: string): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed.startsWith("atkn_")) throw new Error("Invalid automation token");
  await writeSettings({ automation_token: trimmed });
}

export async function clearStoredShopifyAdminToken(): Promise<void> {
  await writeSettings({ access_token: null, scope: null, connected_at: null });
}

export async function getShopifyAdminSettings(): Promise<ShopifyAdminSettings> {
  return readSettings();
}
