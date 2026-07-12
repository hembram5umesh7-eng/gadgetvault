"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { gsap } from "gsap";
import { ArrowLeft2, ArrowRight2, Cpu } from "iconsax-react";
import { Button } from "@/components/ui/button";

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  image: string;
  category: string;
  accent: string;
}

interface HeroSciFiShowcaseProps {
  slides: HeroSlide[];
}

function HeroOrbitRings() {
  return (
    <svg viewBox="0 0 420 420" className="absolute inset-0 m-auto h-[108%] w-[108%] pointer-events-none scifi-orbit" aria-hidden>
      <defs>
        <linearGradient id="scifi-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a3e635" />
          <stop offset="50%" stopColor="#84cc16" />
          <stop offset="100%" stopColor="#65a30d" />
        </linearGradient>
        <filter id="scifi-glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse cx="210" cy="210" rx="185" ry="72" fill="none" stroke="url(#scifi-grad)" strokeWidth="1" opacity="0.35" className="scifi-ring scifi-ring-1" />
      <ellipse cx="210" cy="210" rx="155" ry="155" fill="none" stroke="url(#scifi-grad)" strokeWidth="0.75" opacity="0.2" strokeDasharray="6 14" className="scifi-ring scifi-ring-2" />
      <circle cx="210" cy="210" r="118" fill="none" stroke="#a3e635" strokeWidth="1" opacity="0.15" className="scifi-ring scifi-ring-3" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <circle
          key={deg}
          cx={210 + 155 * Math.cos((deg * Math.PI) / 180)}
          cy={210 + 155 * Math.sin((deg * Math.PI) / 180)}
          r="3"
          fill="#bef264"
          opacity="0.85"
          filter="url(#scifi-glow)"
          className="scifi-node"
        />
      ))}
    </svg>
  );
}

function HeroProductFallback({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center px-4">
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-lime-400/15 border border-lime-400/30 shadow-[0_0_40px_rgba(163,230,53,0.25)]">
        <Cpu size={48} color="#a3e635" variant="Bold" />
      </div>
      <p className="text-sm font-bold text-white/90 line-clamp-2 max-w-[200px]">{title}</p>
    </div>
  );
}

export function HeroSciFiShowcase({ slides }: HeroSciFiShowcaseProps) {
  const [active, setActive] = useState(0);
  const [imgReady, setImgReady] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const holoRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const floatTween = useRef<gsap.core.Tween | null>(null);

  const slide = slides[active];
  const imageSrc = slide?.image ?? "";

  const markReady = useCallback(() => {
    setImgReady(true);
    setImgFailed(false);
    setTransitioning(false);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (slides.length === 0 || transitioning) return;
      const next = ((index % slides.length) + slides.length) % slides.length;
      if (next === active) return;

      setTransitioning(true);
      setImgReady(false);
      setImgFailed(false);
      setActive(next);
    },
    [active, slides.length, transitioning],
  );

  /* Detect cached / already-loaded images (onLoad may not fire) */
  useEffect(() => {
    setImgReady(false);
    setImgFailed(false);
    const img = imgRef.current;
    if (!img || !imageSrc) return;

    if (img.complete && img.naturalWidth > 0) {
      markReady();
      return;
    }

    const t = window.setTimeout(() => {
      if (img.complete && img.naturalWidth > 0) markReady();
    }, 100);

    return () => window.clearTimeout(t);
  }, [active, imageSrc, markReady]);

  /* Subtle entrance on image ready */
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !imgReady) return;
    gsap.fromTo(img, { scale: 0.92, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.55, ease: "power2.out" });
  }, [active, imgReady]);

  useEffect(() => {
    const interval = window.setInterval(() => goTo(active + 1), 6500);
    return () => window.clearInterval(interval);
  }, [active, goTo]);

  useEffect(() => {
    const holo = holoRef.current;
    const scan = scanRef.current;
    if (!holo) return;

    floatTween.current?.kill();
    floatTween.current = gsap.to(holo, {
      y: -14,
      duration: 2.8,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });

    if (scan) {
      gsap.fromTo(scan, { top: "-20%" }, {
        top: "100%",
        duration: 2.4,
        ease: "none",
        repeat: -1,
        repeatDelay: 1.2,
      });
    }

    gsap.to(".scifi-ring-1", { rotate: 360, duration: 22, ease: "none", repeat: -1, transformOrigin: "50% 50%" });
    gsap.to(".scifi-ring-2", { rotate: -360, duration: 30, ease: "none", repeat: -1, transformOrigin: "50% 50%" });

    return () => {
      floatTween.current?.kill();
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const holo = holoRef.current;
    if (!stage || !holo) return;

    const onMove = (e: MouseEvent) => {
      const rect = stage.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(holo, {
        rotateY: x * 14,
        rotateX: -y * 10,
        duration: 0.6,
        ease: "power2.out",
      });
    };

    const onLeave = () => {
      gsap.to(holo, { rotateY: 0, rotateX: 0, duration: 0.8, ease: "power2.out" });
    };

    stage.addEventListener("mousemove", onMove);
    stage.addEventListener("mouseleave", onLeave);
    return () => {
      stage.removeEventListener("mousemove", onMove);
      stage.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  if (!slide) return null;

  const showImage = imgReady && !imgFailed && imageSrc;
  const showFallback = imgFailed || !imageSrc;

  return (
    <div className="w-full max-w-lg mx-auto lg:max-w-xl">
      <div
        ref={stageRef}
        className="relative aspect-square scifi-stage"
        style={{ perspective: "1200px" }}
      >
        <div className="scifi-floor absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] h-[40%] pointer-events-none" aria-hidden />
        <div className="absolute inset-[12%] rounded-full bg-lime-400/20 blur-3xl animate-pulse pointer-events-none" />

        <HeroOrbitRings />

        <span className="scifi-hud scifi-hud-tl" aria-hidden />
        <span className="scifi-hud scifi-hud-tr" aria-hidden />
        <span className="scifi-hud scifi-hud-bl" aria-hidden />
        <span className="scifi-hud scifi-hud-br" aria-hidden />

        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/40 border border-lime-400/30 backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute h-full w-full rounded-full bg-lime-400 opacity-75" />
            <span className="relative rounded-full h-1.5 w-1.5 bg-lime-400" />
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-lime-200/90">Live Preview</span>
        </div>

        <div
          ref={holoRef}
          className="absolute inset-[10%] flex items-center justify-center z-10"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="relative w-full h-full scifi-holo-frame">
            <div className="absolute -inset-[2px] rounded-[2rem] scifi-border-glow opacity-80" aria-hidden />
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/12 via-white/5 to-transparent backdrop-blur-xl border border-white/20 overflow-hidden">
              <div ref={scanRef} className="scifi-scanline absolute left-0 right-0 h-24 pointer-events-none z-[2]" aria-hidden />

              <div className="relative z-[1] w-full h-full flex items-center justify-center p-6 md:p-10 min-h-[200px]">
                {!showImage && !showFallback && (
                  <div className="absolute inset-8 rounded-2xl scifi-shimmer" aria-hidden />
                )}

                {showFallback && <HeroProductFallback title={slide.title} />}

                {imageSrc && (
                  <img
                    ref={imgRef}
                    key={`${slide.id}-${imageSrc}`}
                    src={imageSrc}
                    alt={slide.title}
                    draggable={false}
                    loading="eager"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onLoad={markReady}
                    onError={() => {
                      setImgFailed(true);
                      setImgReady(false);
                      setTransitioning(false);
                    }}
                    className={`relative z-[1] max-h-[min(72vw,320px)] max-w-full w-auto h-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] scifi-product-img transition-opacity duration-300 ${
                      showImage ? "opacity-100 visible" : "opacity-0 invisible absolute pointer-events-none"
                    }`}
                  />
                )}
              </div>

              <div className="absolute inset-0 scifi-holo-overlay pointer-events-none rounded-[2rem] z-[3]" aria-hidden />
            </div>

            <div className="absolute -right-2 top-[18%] z-20 scifi-chip animate-[scifi-float_4s_ease-in-out_infinite]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-lime-300/80">Category</span>
              <span className="block text-xs font-bold text-white mt-0.5 capitalize">{slide.category.replace(/-/g, " ")}</span>
            </div>
            <div className="absolute -left-3 bottom-[22%] z-20 scifi-chip animate-[scifi-float_5s_ease-in-out_infinite_0.8s]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-lime-300/80">Price</span>
              <span className="block text-xs font-bold text-white mt-0.5">{slide.price}</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-[6%] left-1/2 -translate-x-1/2 w-[55%] h-4 rounded-[100%] bg-lime-400/25 blur-xl pointer-events-none z-0" />
      </div>

      <div className="mt-6 relative">
        <div className="scifi-info-panel rounded-2xl border border-white/15 bg-black/25 backdrop-blur-xl px-5 py-4 text-center text-white">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-lime-400/60" />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-lime-300/90">{slide.subtitle}</p>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-lime-400/60" />
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight scifi-title-glow">{slide.title}</h2>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button asChild size="lg" className="h-11 px-6 rounded-xl font-bold bg-gradient-to-r from-lime-500 to-lime-600 text-black hover:from-lime-400 hover:to-lime-500 border-0 shadow-lg shadow-lime-900/40">
              <Link to="/category/$category" params={{ category: slide.category }}>Shop Now</Link>
            </Button>
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={transitioning}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/5 backdrop-blur hover:bg-white/15 transition-colors disabled:opacity-50"
              aria-label="Previous"
            >
              <ArrowLeft2 size={18} color="#fff" variant="Bold" />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              disabled={transitioning}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/5 backdrop-blur hover:bg-white/15 transition-colors disabled:opacity-50"
              aria-label="Next"
            >
              <ArrowRight2 size={18} color="#fff" variant="Bold" />
            </button>
          </div>

          <div className="mt-3 flex justify-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                disabled={transitioning}
                className={`h-1 rounded-full transition-all duration-300 ${i === active ? "w-8 bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.6)]" : "w-2 bg-white/30 hover:bg-white/50"}`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
