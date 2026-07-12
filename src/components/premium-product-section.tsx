import type { ReactNode } from "react";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { ImmersiveReveal } from "@/components/animations/immersive-reveal";
import { cn } from "@/lib/utils";

type PremiumProductSectionProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  products: ProductCardData[];
  viewAll?: ReactNode;
  layout?: "grid" | "rail";
  icon?: ReactNode;
  className?: string;
  emptyMessage?: string;
};

export function PremiumProductSection({
  eyebrow,
  title,
  subtitle,
  products,
  viewAll,
  layout = "grid",
  icon,
  className,
  emptyMessage,
}: PremiumProductSectionProps) {
  if (products.length === 0 && emptyMessage) {
    return null;
  }

  if (products.length === 0) return null;

  const viewAllLink = viewAll ?? null;

  return (
    <section className={cn("relative", className)}>
      <div className="premium-section-shell rounded-[2rem] border border-primary/10 bg-gradient-to-br from-card via-card to-primary/[0.04] p-5 md:p-8 shadow-elegant overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/15 text-primary">
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="premium-eyebrow">{eyebrow}</span>
                <span className="h-px w-8 bg-gradient-to-r from-primary/60 to-transparent" />
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight premium-title-gradient">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-xl leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {viewAllLink && <div className="shrink-0">{viewAllLink}</div>}
        </div>

        {layout === "rail" ? (
          <div className="relative -mx-1">
            <div className="premium-rail-fade-left pointer-events-none" aria-hidden />
            <div className="premium-rail-fade-right pointer-events-none" aria-hidden />
            <div className="flex gap-4 overflow-x-auto pb-2 px-1 snap-x snap-mandatory scrollbar-hide">
              {products.map((p, i) => (
                <div key={p.id} className="snap-start shrink-0 w-[72vw] sm:w-[280px] md:w-[260px]">
                  <ImmersiveReveal delay={i * 40}>
                    <ProductCard p={p} premium />
                  </ImmersiveReveal>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {products.map((p, i) => (
              <ImmersiveReveal key={p.id} delay={i * 35}>
                <ProductCard p={p} premium />
              </ImmersiveReveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
