"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LaunchCountdownPage } from "./LaunchCountdownPage";
import { LaunchRevealMessage } from "./LaunchRevealMessage";
import { shouldShowLaunchCountdown, type LaunchCountdownSettings } from "../lib/launch-settings";
import { bindLaunchAudioUnlock, prepareRevealAudio } from "../lib/launch-audio-unlock";
import { preloadRevealVoice } from "../lib/reveal-voice";
import type { LaunchTemplateConfig } from "../types/launch-template-config";

export type LaunchGateMode = "loading" | "countdown" | "reveal" | "home";

export type LaunchGateProps = {
  config: LaunchTemplateConfig;
  /** Load settings from API, Supabase, localStorage, etc. */
  loadSettings: () => Promise<LaunchCountdownSettings>;
  /** Main site when countdown is off or after reveal */
  children: ReactNode;
  loadingFallback?: ReactNode;
};

const DEFAULT_LOADING = (
  <div className="flex min-h-screen items-center justify-center bg-neutral-950">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-lime-600 border-t-transparent" />
  </div>
);

export function LaunchGate({ config, loadSettings, children, loadingFallback = DEFAULT_LOADING }: LaunchGateProps) {
  const [mode, setMode] = useState<LaunchGateMode>("loading");
  const [settings, setSettings] = useState<LaunchCountdownSettings | null>(null);
  const revealKey = config.sessionRevealKey ?? "launch_reveal_seen";

  useEffect(() => bindLaunchAudioUnlock(() => preloadRevealVoice("en-US")), []);

  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then((s) => {
        if (cancelled) return;
        setSettings(s);
        setMode(shouldShowLaunchCountdown(s) ? "countdown" : "home");
      })
      .catch(() => {
        if (!cancelled) setMode("home");
      });
    return () => {
      cancelled = true;
    };
  }, [loadSettings]);

  const handleLaunchReached = useCallback(() => {
    prepareRevealAudio();
    try {
      sessionStorage.setItem(revealKey, "1");
    } catch {
      /* ignore */
    }
    setMode("reveal");
  }, [revealKey]);

  const handleRevealComplete = useCallback(() => setMode("home"), []);

  if (mode === "loading") return <>{loadingFallback}</>;

  if (mode === "countdown" && settings) {
    return <LaunchCountdownPage config={config} settings={settings} onLaunchReached={handleLaunchReached} />;
  }

  if (mode === "reveal") {
    return <LaunchRevealMessage config={config} onComplete={handleRevealComplete} />;
  }

  return <>{children}</>;
}
