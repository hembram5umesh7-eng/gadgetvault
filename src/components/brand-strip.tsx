import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CJ_TOP_BRANDS, type TopBrand } from "@/lib/brands";
import { cn } from "@/lib/utils";
import { Flash } from "iconsax-react";

function BrandChip({ item }: { item: TopBrand }) {
  const initials = item.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center gap-3 shrink-0 px-5 py-3.5 sm:px-6 sm:py-4 rounded-2xl select-none",
        "border border-primary/15 bg-background/80 backdrop-blur-md",
        "shadow-sm bg-gradient-to-br",
        item.accent,
      )}
      aria-hidden
    >
      <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary/15 border border-primary/25 text-xs sm:text-sm font-extrabold text-primary">
        {initials.slice(0, 2)}
      </div>
      <div className="text-left min-w-[130px] sm:min-w-[150px]">
        <p className="text-sm sm:text-base font-extrabold text-foreground leading-tight">{item.name}</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5">{item.tagline}</p>
      </div>
    </div>
  );
}

function MarqueeRow({
  items,
  direction = "left",
  speed = 48,
}: {
  items: TopBrand[];
  direction?: "left" | "right";
  speed?: number;
}) {
  const loop = useMemo(() => [...items, ...items], [items]);
  if (!items.length) return null;

  return (
    <div className="brand-marquee-mask relative overflow-hidden py-1.5">
      <div
        className={cn(
          "flex w-max gap-3 sm:gap-4",
          direction === "left" ? "brand-marquee-track-left" : "brand-marquee-track-right",
        )}
        style={{ animationDuration: `${speed}s` }}
      >
        {loop.map((item, i) => (
          <BrandChip key={`${item.slug}-${direction}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}

export function BrandStrip() {
  const [liveBrands, setLiveBrands] = useState<TopBrand[]>([]);

  useEffect(() => {
    supabase
      .from("products")
      .select("brand")
      .eq("active", true)
      .then(({ data }) => {
        const seen = new Set<string>();
        const fromDb: TopBrand[] = [];

        for (const row of data ?? []) {
          const brand = row.brand?.trim();
          if (
            brand &&
            brand.length > 2 &&
            !/cj dropshipping/i.test(brand) &&
            !seen.has(brand.toLowerCase())
          ) {
            seen.add(brand.toLowerCase());
            fromDb.push({
              name: brand,
              slug: brand.toLowerCase().replace(/\s+/g, "-"),
              tagline: "We deal in this brand",
              accent: "from-primary/15 to-lime-500/10",
            });
          }
        }

        setLiveBrands(fromDb.slice(0, 8));
      });
  }, []);

  const allBrands = useMemo(() => {
    const merged = [...CJ_TOP_BRANDS];
    for (const b of liveBrands) {
      if (!merged.some((m) => m.name.toLowerCase() === b.name.toLowerCase())) {
        merged.push(b);
      }
    }
    return merged;
  }, [liveBrands]);

  const { rowLeft, rowRight } = useMemo(() => {
    const mid = Math.ceil(allBrands.length / 2);
    let left = allBrands.slice(0, mid);
    let right = allBrands.slice(mid);
    if (right.length === 0) right = [...left];
    if (left.length < 4) left = [...left, ...CJ_TOP_BRANDS.slice(0, 4 - left.length)];
    if (right.length < 4) right = [...right, ...CJ_TOP_BRANDS.slice(0, 4 - right.length)];
    return { rowLeft: left, rowRight: right };
  }, [allBrands]);

  return (
    <section className="relative py-10 md:py-14 overflow-hidden" aria-label="Top brands we deal in">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-primary/[0.03] pointer-events-none" />
      <div className="absolute inset-0 hero-grid opacity-[0.03] pointer-events-none" />

      <div className="container mx-auto px-4 mb-6 md:mb-8 relative">
        <div className="text-center sm:text-left">
          <div className="inline-flex items-center gap-2 mb-2">
            <Flash size={16} variant="Bold" color="var(--primary)" />
            <span className="premium-eyebrow">CJ sourced partners</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Shop Top Brands
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl mx-auto sm:mx-0">
            Brands & ranges we deal in — fulfilled through CJ Dropshipping partners.
          </p>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <MarqueeRow items={rowLeft} direction="left" speed={52} />
        <MarqueeRow items={rowRight} direction="right" speed={46} />
      </div>

      <p className="text-center text-[10px] text-muted-foreground/80 mt-5 px-4">
        Fulfilled via CJ Dropshipping · Stock varies by partner
      </p>
    </section>
  );
}
