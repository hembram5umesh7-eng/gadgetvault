import { supabase } from "@/integrations/supabase/client";
import {
  LAUNCH_SETTINGS_KEY,
  parseLaunchSettings,
  type LaunchCountdownSettings,
} from "@launch-template/lib/launch-settings";

export async function fetchPublicLaunchSettings(): Promise<LaunchCountdownSettings> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", LAUNCH_SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    console.warn("Launch settings fetch failed:", error.message);
    return parseLaunchSettings(null);
  }
  return parseLaunchSettings(data?.value);
}
