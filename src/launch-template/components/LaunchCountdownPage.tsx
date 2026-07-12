"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CinematicLaunchHero } from "./CinematicLaunchHero";
import { calcTimeLeft, formatLaunchDate } from "../lib/launch-countdown";
import { bindLaunchAudioUnlock, primeRevealSpeech, unlockLaunchAudio } from "../lib/launch-audio-unlock";
import { preloadRevealVoice } from "../lib/reveal-voice";
import type { LaunchCountdownSettings } from "../lib/launch-settings";
import type { LaunchTemplateConfig } from "../types/launch-template-config";

type Props = {
  config: LaunchTemplateConfig;
  settings: LaunchCountdownSettings;
  onLaunchReached?: () => void;
  finishingMessage?: string;
};

export function LaunchCountdownPage({
  config,
  settings,
  onLaunchReached,
  finishingMessage = "The moment has arrived…",
}: Props) {
  const [left, setLeft] = useState(() => calcTimeLeft(settings.launchAt));
  const [finished, setFinished] = useState(() => calcTimeLeft(settings.launchAt).totalMs <= 0);
  const firedRef = useRef(false);
  const touchPrimedRef = useRef(false);

  const handlePointerPrime = () => {
    if (touchPrimedRef.current) return;
    touchPrimedRef.current = true;
    unlockLaunchAudio();
    primeRevealSpeech();
  };

  const launchDateLabel = useMemo(() => formatLaunchDate(settings.launchAt), [settings.launchAt]);

  useEffect(() => bindLaunchAudioUnlock(() => preloadRevealVoice("en-US")), []);

  useEffect(() => {
    const tick = () => {
      const next = calcTimeLeft(settings.launchAt);
      setLeft(next);
      if (next.totalMs <= 0) {
        setFinished(true);
        if (!firedRef.current) {
          firedRef.current = true;
          onLaunchReached?.();
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [settings.launchAt, onLaunchReached]);

  if (finished) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030305] text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className="mt-4 text-sm text-white/50">{finishingMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" onPointerDownCapture={handlePointerPrime}>
      <CinematicLaunchHero
        config={config}
        headline={settings.headline}
        tagline={settings.tagline}
        launchDateLabel={launchDateLabel}
        countdown={{
          days: left.days,
          hours: left.hours,
          minutes: left.minutes,
          seconds: left.seconds,
        }}
      />
    </div>
  );
}
