import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { animate } from "animejs";
import { ArrowLeft2, ArrowRight2 } from "iconsax-react";
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

interface HeroProductShowcaseProps {
  slides: HeroSlide[];
}

export function Hero3DSlider({ slides }: HeroProductShowcaseProps) {
  const [active, setActive] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (slides.length === 0) return;
      setActive(((index % slides.length) + slides.length) % slides.length);
      setImgLoaded(false);
    },
    [slides.length],
  );

  useEffect(() => {
    const interval = setInterval(() => goTo(active + 1), 6000);
    return () => clearInterval(interval);
  }, [active, goTo]);

  useEffect(() => {
    const el = document.querySelector("[data-hero-showcase]");
    if (!el) return;
    animate(el, {
      opacity: [0.85, 1],
      scale: [0.98, 1],
      duration: 500,
      ease: "out(3)",
    });
  }, [active]);

  const slide = slides[active];
  if (!slide) return null;

  return (
    <div className="w-full max-w-md mx-auto lg:max-w-lg">
      {/* Product image card */}
      <div
        data-hero-showcase
        className="relative rounded-3xl bg-white/10 backdrop-blur-md border border-white/25 p-4 shadow-2xl"
      >
        <div className="aspect-square rounded-2xl bg-white overflow-hidden flex items-center justify-center">
          <img
            key={slide.id}
            src={slide.image}
            alt=""
            draggable={false}
            onLoad={() => setImgLoaded(true)}
            className={`w-full h-full object-contain p-4 transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          />
          {!imgLoaded && (
            <div className="absolute inset-4 rounded-2xl bg-white/50 animate-pulse" />
          )}
        </div>
      </div>

      {/* Product info — separate from image, no overlap */}
      <div className="mt-6 text-center text-white px-2">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/75">{slide.subtitle}</p>
        <h2 className="mt-2 text-2xl md:text-3xl font-extrabold leading-tight">{slide.title}</h2>
        <p className="mt-1.5 text-lg font-semibold text-white/90">{slide.price}</p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 font-bold rounded-xl h-11 px-6">
            <Link to="/category/$category" params={{ category: slide.category }}>Shop Now</Link>
          </Button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur hover:bg-white/20 transition-colors"
              aria-label="Previous"
            >
              <ArrowLeft2 size={18} color="#fff" variant="Bold" />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur hover:bg-white/20 transition-colors"
              aria-label="Next"
            >
              <ArrowRight2 size={18} color="#fff" variant="Bold" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-7 bg-white" : "w-2 bg-white/40 hover:bg-white/60"}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
