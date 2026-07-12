"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Sparkles } from "lucide-react";
import { cn } from "../lib/cn";
import { padCountdown, type TimeLeft } from "../lib/launch-countdown";
import { CINEMATIC_LAUNCH_STYLES } from "../styles/cinematic-launch-styles";
import type { LaunchTemplateConfig } from "../types/launch-template-config";

export type CinematicLaunchHeroProps = React.HTMLAttributes<HTMLDivElement> & {
  config: LaunchTemplateConfig;
  headline: string;
  tagline: string;
  launchDateLabel: string;
  countdown: Pick<TimeLeft, "days" | "hours" | "minutes" | "seconds">;
};

function CountdownTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 min-w-[4.25rem] sm:min-w-[5.25rem]">
      <div className="countdown-tile w-full rounded-2xl px-3 py-3 sm:px-4 sm:py-4">
        <span className="block text-center font-mono text-2xl sm:text-4xl md:text-5xl font-extrabold tabular-nums tracking-tight text-white">
          {value}
        </span>
      </div>
      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">{label}</span>
    </div>
  );
}

export function CinematicLaunchHero({
  config,
  headline,
  tagline,
  launchDateLabel,
  countdown,
  className,
  ...props
}: CinematicLaunchHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const accent = config.accentClassName ?? "text-orange-500";

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;
      cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(() => {
        const rect = cardRef.current!.getBoundingClientRect();
        cardRef.current!.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
        cardRef.current!.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.set(".launch-intro", { autoAlpha: 0, y: 40, filter: "blur(12px)" });
      gsap.set(".launch-photo", { autoAlpha: 0, scale: 0.92, y: 24 });
      gsap.set(".launch-feature", { autoAlpha: 0, y: 20 });
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .to(".launch-intro", { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.2, stagger: 0.12 })
        .to(".launch-photo", { autoAlpha: 1, scale: 1, y: 0, duration: 1, stagger: 0.08 }, "-=0.7")
        .to(".launch-feature", { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1 }, "-=0.5");
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const [cardA, cardB] = config.infoCards;

  return (
    <div
      ref={rootRef}
      className={cn("relative min-h-screen w-full overflow-x-hidden bg-[#050508] text-white antialiased", className)}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: CINEMATIC_LAUNCH_STYLES }} />
      <div className="film-grain" aria-hidden="true" />
      <div className="bg-grid-launch pointer-events-none absolute inset-0 z-0 opacity-60" aria-hidden="true" />

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <div className="launch-intro mb-8 flex justify-center">
          <span className="floating-ui-badge inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/90">
            <Sparkles className={cn("h-3.5 w-3.5", accent)} />
            {config.comingSoonLabel}
          </span>
        </div>

        <div className="launch-intro text-center">
          <p className={cn("mb-3 text-xs font-semibold uppercase tracking-[0.35em]", accent)}>{config.eyebrow}</p>
          <h1 className="text-3d-matte text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
            {headline}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/55 sm:text-lg md:text-xl">{tagline}</p>
        </div>

        <div
          ref={cardRef}
          className="launch-intro premium-depth-card relative mx-auto mt-10 w-full max-w-4xl overflow-hidden rounded-[28px] md:rounded-[36px]"
        >
          <div className="card-sheen" aria-hidden="true" />
          <div className="relative z-10 px-5 py-8 sm:px-10 sm:py-10">
            <div className="text-center">
              <h2 className="text-silver-matte text-2xl font-extrabold tracking-tight sm:text-3xl">
                {config.countdownTitle}
              </h2>
              <p className="mt-2 text-sm text-white/45">We go live on {launchDateLabel}</p>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4">
              <CountdownTile value={padCountdown(countdown.days)} label="Days" />
              <span className="hidden pb-6 text-2xl font-light text-white/20 sm:block">:</span>
              <CountdownTile value={padCountdown(countdown.hours)} label="Hours" />
              <span className="hidden pb-6 text-2xl font-light text-white/20 sm:block">:</span>
              <CountdownTile value={padCountdown(countdown.minutes)} label="Minutes" />
              <span className="hidden pb-6 text-2xl font-light text-white/20 sm:block">:</span>
              <CountdownTile value={padCountdown(countdown.seconds)} label="Seconds" />
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[cardA, cardB].map((card) => (
                <div key={card.title} className="floating-ui-badge rounded-2xl p-4 text-left">
                  <p className={cn("text-xs font-bold uppercase tracking-wider", accent)}>{card.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {config.photos.map((photo) => (
            <div key={photo.src} className="launch-photo group relative overflow-hidden rounded-2xl photo-frame">
              <img
                src={photo.src}
                alt={photo.alt}
                className="aspect-[4/5] h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <span className="absolute bottom-3 left-3 text-xs font-bold uppercase tracking-wider text-white/90">
                {photo.label}
              </span>
            </div>
          ))}
        </div>

        <section className="mt-14">
          <h3 className="launch-intro text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            <span className="text-silver-matte">{config.featuresSectionTitle}</span>
          </h3>
          <p className="launch-intro mx-auto mt-3 max-w-xl text-center text-sm text-white/50 sm:text-base">
            {config.featuresSectionSubtitle}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {config.features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="launch-feature feature-pill rounded-2xl p-4">
                <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5", accent)}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-bold text-white">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/50 sm:text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="launch-intro mt-16 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/25">{config.brandName}</p>
          <p className="mt-2 text-xs text-white/35">{config.footerTagline}</p>
        </footer>
      </main>
    </div>
  );
}
