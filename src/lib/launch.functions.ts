import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  LAUNCH_SETTINGS_KEY,
  parseLaunchSettings,
  type LaunchCountdownSettings,
} from "@launch-template/lib/launch-settings";

async function assertStaffOrAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.includes("admin") && !roles.includes("staff")) throw new Error("Forbidden");
}

export const getLaunchSettingsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaffOrAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", LAUNCH_SETTINGS_KEY)
      .maybeSingle();
    return parseLaunchSettings(data?.value);
  });

const saveInput = z.object({
  enabled: z.boolean(),
  launchAt: z.string().min(1),
  headline: z.string().min(1).max(120),
  tagline: z.string().min(1).max(240),
});

export const saveLaunchSettingsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => saveInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaffOrAdmin(context.userId);
    const payload: LaunchCountdownSettings = {
      enabled: data.enabled,
      launchAt: data.launchAt,
      headline: data.headline.trim(),
      tagline: data.tagline.trim(),
    };
    const { error } = await supabaseAdmin.from("app_settings").upsert({
      key: LAUNCH_SETTINGS_KEY,
      value: payload,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
