import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { HeroSciFiShowcase, type HeroSlide } from "@/components/animations/hero-scifi-showcase";
import { DELIVERY_ESTIMATES } from "@/lib/legal-copy";
import { Cpu, Flash, ShieldTick } from "iconsax-react";

interface FuturisticHeroProps {
  slides: HeroSlide[];
  defaultCategory: string;
  productCount?: number;
}

export function FuturisticHero({ slides, defaultCategory, productCount = 0 }: FuturisticHeroProps) {
  return (
    <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-gradient-hero text-white">
      {/* Animated mesh background */}
      <div className="absolute inset-0 hero-mesh opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(255,255,255,0.14),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(107,142,35,0.25),transparent_45%)]" />
      <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-lime-400/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-16 w-96 h-96 rounded-full bg-emerald-300/15 blur-3xl animate-pulse [animation-delay:1.5s]" />

      {/* Grid overlay */}
      <div className="absolute inset-0 hero-grid opacity-[0.07]" />

      <div className="container mx-auto px-4 py-12 md:py-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/25 bg-white/10 backdrop-blur-md text-[11px] font-bold uppercase tracking-[0.2em]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-400" />
              </span>
              GadgetVault · Future Store
            </div>

            <h1 className="mt-5 text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-extrabold leading-[1.05] tracking-tight">
              <span className="hero-text-glow">Next-Gen</span>
              <br />
              Gadgets.
              <br />
              <span className="text-white/85">Olive Premium.</span>
            </h1>

            <p className="mt-5 text-base md:text-lg text-white/85 max-w-lg leading-relaxed">
              Kitchen tools, unique gadgets & daily essentials — secure Razorpay checkout, honest delivery estimates, full legal transparency.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { icon: ShieldTick, text: "Secure checkout" },
                { icon: Cpu, text: "CJ fulfilled" },
                { icon: Flash, text: "Est. " + DELIVERY_ESTIMATES.totalTypical },
              ].map((chip) => (
                <span key={chip.text} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/20 border border-white/15 text-xs font-semibold backdrop-blur-sm">
                  <chip.icon size={14} variant="Bold" color="#fff" />
                  {chip.text}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 px-8 rounded-2xl font-bold bg-white text-primary hover:bg-white/95 shadow-lg shadow-black/20">
                <Link to="/category/$category" params={{ category: defaultCategory }}>Explore Store →</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8 rounded-2xl font-bold border-white/50 text-white bg-white/5 hover:bg-white/15 backdrop-blur-sm">
                <Link to="/deals">View Deals</Link>
              </Button>
            </div>

            {productCount > 0 && (
              <p className="mt-6 text-sm text-white/60 font-medium">
                {productCount}+ products live · 3 curated categories
              </p>
            )}
          </div>

          <div className="order-1 lg:order-2 relative">
            <div className="absolute -inset-8 rounded-full bg-lime-400/15 blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[85%] rounded-full border border-lime-400/10 pointer-events-none scifi-pulse-ring" aria-hidden />
            <HeroSciFiShowcase slides={slides} />
          </div>
        </div>
      </div>
    </section>
  );
}
