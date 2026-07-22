import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FeatureCarouselImage {
  src: string;
  alt: string;
  caption?: string;
  price?: string;
  categoryLabel?: string;
  /** @deprecated use price + categoryLabel */
  subcaption?: string;
  href?: string;
  hrefParams?: Record<string, string>;
}

export interface FeatureCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  subtitle?: string;
  images: FeatureCarouselImage[];
  autoPlayMs?: number;
  viewAll?: React.ReactNode;
}

function getCardPosition(index: number, currentIndex: number, total: number) {
  const offset = index - currentIndex;
  let pos = (offset + total) % total;
  if (pos > Math.floor(total / 2)) pos = pos - total;
  return pos;
}

const SLIDE_EASE = "cubic-bezier(0.33, 1, 0.68, 1)";

export const FeatureCarousel = React.forwardRef<HTMLDivElement, FeatureCarouselProps>(
  ({ title, subtitle, images, autoPlayMs = 5500, viewAll, className, ...props }, ref) => {
    const [currentIndex, setCurrentIndex] = React.useState(() =>
      images.length ? Math.min(Math.floor(images.length / 2), images.length - 1) : 0,
    );
    const [isMdUp, setIsMdUp] = React.useState(true);
    const [paused, setPaused] = React.useState(false);

    React.useEffect(() => {
      const mq = window.matchMedia("(min-width: 768px)");
      const update = () => setIsMdUp(mq.matches);
      update();
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }, []);

    const goTo = React.useCallback((index: number) => {
      if (!images.length) return;
      setCurrentIndex(((index % images.length) + images.length) % images.length);
    }, [images.length]);

    const handleNext = React.useCallback(() => {
      goTo(currentIndex + 1);
    }, [currentIndex, goTo]);

    const handlePrev = React.useCallback(() => {
      goTo(currentIndex - 1);
    }, [currentIndex, goTo]);

    React.useEffect(() => {
      if (images.length < 2 || paused) return;
      const timer = window.setInterval(handleNext, autoPlayMs);
      return () => window.clearInterval(timer);
    }, [handleNext, autoPlayMs, images.length, paused]);

    if (!images.length) return null;

    const active = images[currentIndex];

    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-[1.75rem] md:rounded-[2rem] border border-primary/15",
          "bg-gradient-to-br from-card via-card to-primary/[0.06]",
          "px-4 py-8 sm:px-6 sm:py-10 md:px-10 md:py-12 shadow-elegant",
          className,
        )}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        {...props}
      >
        <div className="absolute inset-0 z-0 opacity-50 pointer-events-none overflow-hidden rounded-[inherit]" aria-hidden>
          <div className="absolute bottom-0 left-[-10%] top-[-15%] h-[min(520px,80%)] w-[min(520px,70%)] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(132,204,22,0.22),transparent)]" />
          <div className="absolute bottom-0 right-[-10%] top-[-15%] h-[min(520px,80%)] w-[min(520px,70%)] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(107,142,35,0.18),transparent)]" />
        </div>

        <div className="relative z-10 flex w-full flex-col gap-8 md:gap-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="premium-eyebrow">Fresh drops</span>
                <span className="h-px w-10 bg-gradient-to-r from-primary/60 to-transparent" />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] text-foreground">
                {title}
              </h2>
              {subtitle && (
                <p className="max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
            {viewAll && <div className="shrink-0 self-start sm:self-end">{viewAll}</div>}
          </div>

          <div className="relative w-full overflow-hidden py-2 sm:py-4">
            <div
              className="relative mx-auto w-full max-w-4xl h-[280px] sm:h-[340px] md:h-[380px] lg:h-[420px]"
              aria-roledescription="carousel"
            >
              <div className="absolute inset-0 flex items-center justify-center [perspective:1200px] overflow-hidden">
                {images.map((image, index) => {
                  const pos = getCardPosition(index, currentIndex, images.length);
                  const isCenter = pos === 0;
                  const isAdjacent = Math.abs(pos) === 1;
                  const showSide = isMdUp && isAdjacent;
                  const visible = isCenter || showSide;

                  const cardInner = (
                    <div
                      className={cn(
                        "relative w-full h-full rounded-3xl overflow-hidden bg-muted shadow-2xl",
                        "border-2 transition-shadow duration-700",
                        isCenter
                          ? "border-primary/50 ring-2 ring-primary/25 shadow-primary/30"
                          : "border-border/40",
                      )}
                    >
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-full object-contain p-3 sm:p-4 bg-gradient-to-b from-muted/30 to-muted/80"
                        draggable={false}
                        loading="lazy"
                      />
                      {isCenter && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent pt-12 pb-4 px-4 sm:px-5">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {(image.price || image.subcaption?.split("·")[0]?.trim()) && (
                              <span className="inline-flex items-center rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-base font-extrabold shadow-lg ring-2 ring-white/30">
                                {image.price ?? image.subcaption?.split("·")[0]?.trim()}
                              </span>
                            )}
                            {(image.categoryLabel || image.subcaption?.split("·")[1]?.trim()) && (
                              <span className="inline-flex items-center rounded-lg bg-white/95 text-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                                {image.categoryLabel ?? image.subcaption?.split("·")[1]?.trim()}
                              </span>
                            )}
                          </div>
                          {image.caption && (
                            <p className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 drop-shadow-md">
                              {image.caption}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );

                  return (
                    <div
                      key={`${image.src}-${index}`}
                      className={cn(
                        "absolute top-1/2 left-1/2 will-change-transform",
                        "w-[min(72vw,240px)] h-[min(72vw,240px)]",
                        "sm:w-[260px] sm:h-[300px]",
                        "md:w-[280px] md:h-[320px]",
                        "lg:w-[300px] lg:h-[340px]",
                        "motion-reduce:transition-none",
                      )}
                      style={{
                        transform: visible
                          ? `translate(calc(-50% + ${pos * (isMdUp ? 88 : 0)}%), -50%) scale(${isCenter ? 1 : 0.88}) rotateY(${pos * -6}deg)`
                          : "translate(-50%, -50%) scale(0.75)",
                        transition: `transform 0.75s ${SLIDE_EASE}, opacity 0.75s ${SLIDE_EASE}`,
                        zIndex: isCenter ? 10 : 5 - Math.abs(pos),
                        opacity: visible ? (isCenter ? 1 : 0.45) : 0,
                        pointerEvents: isCenter ? "auto" : "none",
                      }}
                    >
                      {isCenter && image.href ? (
                        <Link
                          to={image.href}
                          params={image.hrefParams}
                          className="block w-full h-full rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          {cardInner}
                        </Link>
                      ) : (
                        cardInner
                      )}
                    </div>
                  );
                })}
              </div>

              {images.length > 1 && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 rounded-full h-11 w-11 z-20 bg-background/95 backdrop-blur-md border-primary/25 shadow-md"
                    onClick={handlePrev}
                    aria-label="Previous product"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 rounded-full h-11 w-11 z-20 bg-background/95 backdrop-blur-md border-primary/25 shadow-md"
                    onClick={handleNext}
                    aria-label="Next product"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {active && (
            <div className="mx-auto w-full max-w-xl text-center space-y-4">
              <div className="rounded-2xl border border-border/60 bg-background px-4 py-4 sm:px-6 sm:py-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                  {active.price && (
                    <span className="text-2xl sm:text-3xl font-extrabold text-primary">{active.price}</span>
                  )}
                  {active.categoryLabel && (
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground bg-muted px-2.5 py-1 rounded-lg border border-border/60">
                      {active.categoryLabel}
                    </span>
                  )}
                </div>
                {active.caption && (
                  <p className="text-base sm:text-lg font-bold text-foreground leading-snug">{active.caption}</p>
                )}
              </div>

              {active.href && (
                <Button asChild size="lg" className="rounded-2xl font-bold px-10 h-12 text-base shadow-lg">
                  <Link to={active.href} params={active.hrefParams}>
                    Shop This Item
                  </Link>
                </Button>
              )}

              <div className="flex justify-center gap-2 pt-1">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-500 ease-out",
                      i === currentIndex
                        ? "w-10 bg-primary shadow-[0_0_10px_rgba(107,142,35,0.5)]"
                        : "w-2 bg-muted-foreground/35 hover:bg-muted-foreground/55",
                    )}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === currentIndex ? "true" : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

FeatureCarousel.displayName = "FeatureCarousel";

export const HeroSection = FeatureCarousel;
