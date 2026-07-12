export type LaunchCountdownSettings = {
  enabled: boolean;
  launchAt: string;
  headline: string;
  tagline: string;
};

export const LAUNCH_SETTINGS_KEY = "launch_countdown";

export const DEFAULT_LAUNCH_SETTINGS: LaunchCountdownSettings = {
  enabled: false,
  launchAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  headline: "We're Launching Soon",
  tagline: "Something great is on the way.",
};

export function parseLaunchSettings(raw: unknown): LaunchCountdownSettings {
  const v = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const launchAt =
    typeof v.launchAt === "string" && v.launchAt.trim() ? v.launchAt.trim() : DEFAULT_LAUNCH_SETTINGS.launchAt;
  return {
    enabled: Boolean(v.enabled),
    launchAt,
    headline:
      typeof v.headline === "string" && v.headline.trim() ? v.headline.trim() : DEFAULT_LAUNCH_SETTINGS.headline,
    tagline:
      typeof v.tagline === "string" && v.tagline.trim() ? v.tagline.trim() : DEFAULT_LAUNCH_SETTINGS.tagline,
  };
}

export function shouldShowLaunchCountdown(settings: LaunchCountdownSettings, now = Date.now()): boolean {
  if (!settings.enabled) return false;
  const launchMs = Date.parse(settings.launchAt);
  if (!Number.isFinite(launchMs)) return false;
  return now < launchMs;
}

export function launchCountdownStatus(
  settings: LaunchCountdownSettings,
  now = Date.now(),
): "disabled" | "scheduled" | "live" {
  if (!settings.enabled) return "disabled";
  const launchMs = Date.parse(settings.launchAt);
  if (!Number.isFinite(launchMs) || now >= launchMs) return "live";
  return "scheduled";
}

export function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToIso(local: string): string {
  const d = new Date(local);
  if (!Number.isFinite(d.getTime())) throw new Error("Invalid date");
  return d.toISOString();
}
