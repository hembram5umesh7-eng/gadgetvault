"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ArrowRight, Sparkles, Volume2, VolumeX } from "lucide-react";
import { cn } from "../lib/cn";
import { prepareRevealAudio } from "../lib/launch-audio-unlock";
import { createRevealVoiceController, estimateRevealVoiceDurationMs, preloadRevealVoice } from "../lib/reveal-voice";
import { CINEMATIC_LAUNCH_STYLES } from "../styles/cinematic-launch-styles";
import type { LaunchTemplateConfig } from "../types/launch-template-config";
import type { RevealVoiceController } from "../lib/reveal-voice";

type Props = {
  config: LaunchTemplateConfig;
  onComplete: () => void;
  autoAdvanceMs?: number;
};

function startVoiceAuto(voice: RevealVoiceController | null, muted: boolean) {
  if (muted || !voice) return;
  prepareRevealAudio();
  voice.start();
  for (const ms of [120, 350, 700]) {
    window.setTimeout(() => {
      const syn = typeof speechSynthesis !== "undefined" ? speechSynthesis : null;
      if (syn && !syn.speaking && !syn.pending) voice.start();
    }, ms);
  }
}

export function LaunchRevealMessage({ config, onComplete, autoAdvanceMs }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<RevealVoiceController | null>(null);
  const mutedRef = useRef(false);
  const [exiting, setExiting] = useState(false);
  const [muted, setMuted] = useState(false);
  const completedRef = useRef(false);
  const { reveal } = config;
  const accent = config.accentClassName ?? "text-orange-500";
  const voiceEnabled = reveal.voice?.enabled !== false;
  const advanceMs =
    autoAdvanceMs ??
    (voiceEnabled ? estimateRevealVoiceDurationMs(reveal) + 2500 : 12000);

  mutedRef.current = muted;

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    voiceRef.current?.stop();
    setExiting(true);
    gsap.to(rootRef.current, {
      autoAlpha: 0,
      y: -24,
      filter: "blur(8px)",
      duration: 0.9,
      ease: "power2.inOut",
      onComplete,
    });
  };

  useEffect(() => {
    if (!rootRef.current) return;

    if (voiceEnabled) {
      prepareRevealAudio();
      preloadRevealVoice(reveal.voice?.lang ?? "en-US");
      voiceRef.current = createRevealVoiceController(reveal, reveal.voice);
    }

    const ctx = gsap.context(() => {
      gsap.set(".reveal-line", { autoAlpha: 0, y: 36, filter: "blur(10px)" });
      gsap.set(".reveal-body", { autoAlpha: 0, y: 20 });
      gsap.set(".reveal-closer", { autoAlpha: 0, scale: 0.96 });
      gsap.set(".reveal-cta", { autoAlpha: 0, y: 16 });

      gsap
        .timeline({
          defaults: { ease: "power3.out" },
          onStart: () => {
            if (voiceEnabled) startVoiceAuto(voiceRef.current, mutedRef.current);
          },
        })
        .to(".reveal-line", { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.1, stagger: 0.35 })
        .to(".reveal-body", { autoAlpha: 1, y: 0, duration: 1.2 }, "-=0.5")
        .to(".reveal-closer", { autoAlpha: 1, scale: 1, duration: 0.9 }, "-=0.4")
        .to(".reveal-cta", { autoAlpha: 1, y: 0, duration: 0.7 }, "-=0.3");
    }, rootRef);

    return () => {
      ctx.revert();
      voiceRef.current?.stop();
    };
  }, [reveal, voiceEnabled]);

  useEffect(() => {
    const t = window.setTimeout(() => finish(), advanceMs);
    return () => window.clearTimeout(t);
  }, [advanceMs]);

  const toggleVoice = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    voiceRef.current?.setMuted(nextMuted);
    if (!nextMuted) startVoiceAuto(voiceRef.current, false);
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-[#030305] px-4 text-white",
        exiting && "pointer-events-none",
      )}
      role="dialog"
      aria-labelledby="launch-reveal-title"
    >
      <style dangerouslySetInnerHTML={{ __html: CINEMATIC_LAUNCH_STYLES }} />
      <div className="film-grain" aria-hidden="true" />
      <div className="bg-grid-launch pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />

      {voiceEnabled && (
        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
          <button
            type="button"
            onClick={toggleVoice}
            aria-label={muted ? "Unmute narrator" : "Mute narrator"}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <span className={cn("reveal-line mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em]", accent)}>
          <Sparkles className="h-3.5 w-3.5" />
          {reveal.badge}
        </span>

        <div id="launch-reveal-title" className="space-y-2">
          {reveal.lines.map((line) => (
            <p key={line} className="reveal-line text-3d-matte text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
              {line}
            </p>
          ))}
        </div>

        <p className="reveal-body mx-auto mt-8 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
          {reveal.body}
        </p>

        <p className="reveal-closer mt-10 text-lg font-bold tracking-tight sm:text-xl">
          <span className="text-silver-matte">{reveal.closer}</span>
        </p>

        <div className="reveal-cta mt-10 flex flex-col items-center gap-3">
          <button type="button" className="launch-btn-primary" onClick={() => finish()}>
            {reveal.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-xs text-white/35">{reveal.ctaSubtext}</p>
        </div>
      </div>
    </div>
  );
}
