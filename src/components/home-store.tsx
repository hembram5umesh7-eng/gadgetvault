import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchProductCards, fetchActiveProductCount } from "@/lib/products";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { CategoryTile } from "@/components/category-tile";
import { BrandStrip } from "@/components/brand-strip";
import { TrustBar, PaymentStrip } from "@/components/gadget-trust";
import { FuturisticHero } from "@/components/futuristic-hero";
import { DeliveryTimelineSection } from "@/components/delivery-timeline-section";
import { LegalTrustStrip } from "@/components/legal-trust-strip";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/lib/categories";
import { PersonalizedHomeSections } from "@/components/personalized-home-sections";
import { NewArrivalsCarousel } from "@/components/new-arrivals-carousel";
import { type HeroSlide } from "@/components/animations/hero-scifi-showcase";
import { fetchFlashSaleCatalog } from "@/lib/flash-sale-client";
import { DEFAULT_FLASH_SALE, type FlashSaleSettings } from "@/lib/flash-sale-settings";
import { formatINR } from "@/lib/order-utils";
import { STORE_FAQ } from "@/lib/faq-data";
import { Flash, ShieldTick, Truck } from "iconsax-react";

const FALLBACK_HERO_SLIDES: HeroSlide[] = [
  { id: "1", title: "Kitchen Essentials", subtitle: "Smart organizers & tools", price: "From ₹299", image: "https://images.unsplash.com/photo-1556911223-bff03130eb78?w=800&q=80", category: "kitchen-accessories", accent: "" },
  { id: "2", title: "Unique Gadgets", subtitle: "Innovative finds for daily life", price: "Shop now", image: "https://images.unsplash.com/photo-1585819409453-0e95a44c0d34?w=800&q=80", category: "unique-gadgets", accent: "" },
  { id: "3", title: "Daily Necessities", subtitle: "Must-haves at best prices", price: "Free ship ₹999+", image: "https://images.unsplash.com/photo-1585771724684-e3823f9ee8ef?w=800&q=80", category: "necessities", accent: "" },
];

function buildHeroSlides(products: ProductCardData[]): HeroSlide[] {
  const withImages = products.filter((p) => p.images?.[0]);
  if (withImages.length === 0) return FALLBACK_HERO_SLIDES;

  const slides = withImages.slice(0, 3).map((p) => ({
    id: p.id,
    title: p.name,
    subtitle: p.brand ?? p.category.replace(/-/g, " "),
    price: `From ${formatINR(p.base_price)}`,
    image: p.images![0],
    category: p.category,
    accent: "",
  }));

  while (slides.length < 3) {
    const fb = FALLBACK_HERO_SLIDES[slides.length];
    if (fb) slides.push(fb);
  }
  return slides;
}

export function HomeStore() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [bestsellers, setBestsellers] = useState<ProductCardData[]>([]);
  const [deals, setDeals] = useState<ProductCardData[]>([]);
  const [flashSale, setFlashSale] = useState<FlashSaleSettings>(DEFAULT_FLASH_SALE);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(FALLBACK_HERO_SLIDES);
  const [productCount, setProductCount] = useState(0);
  const { categories } = useCategories();

  useEffect(() => {
    Promise.all([
      fetchProductCards({ limit: 8 }),
      fetchProductCards({ limit: 4, bestseller: true }),
      fetchFlashSaleCatalog(),
      fetchActiveProductCount(),
    ]).then(([all, best, flash, count]) => {
      setProducts(all);
      setBestsellers(best);
      setHeroSlides(buildHeroSlides(all));
      setFlashSale(flash.settings);
      setDeals(flash.products.slice(0, 4));
      setProductCount(count);
    });
  }, []);

  const trustStats = [
    { icon: ShieldTick, value: "Razorpay", label: "Secure payments" },
    { icon: Truck, value: "Pan-India", label: "Delivery coverage" },
    { icon: Flash, value: String(categories.length || "—"), label: "Shop categories" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <FuturisticHero slides={heroSlides} productCount={productCount} categoryCount={categories.length} />

        {categories.length > 0 && (
          <section className="container mx-auto px-4 -mt-8 relative z-20 mb-2">
            <div className="premium-card p-3 md:p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3 shadow-elegant border-primary/10">
              {categories.slice(0, 6).map((c) => (
                <Link
                  key={c.slug}
                  to="/category/$category"
                  params={{ category: c.slug }}
                  className="group flex flex-col items-center gap-1.5 p-2 md:p-3 rounded-xl hover:bg-primary/5 transition-all text-center"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 group-hover:scale-105 transition-transform overflow-hidden">
                    {c.image_url ? (
                      <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-primary">{c.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-[11px] md:text-xs font-bold text-foreground line-clamp-2">{c.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="container mx-auto px-4 py-8 md:py-10">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Browse</p>
              <h2 className="text-xl md:text-2xl font-extrabold">Shop by Category</h2>
            </div>
            <Link to="/shop" className="text-sm font-semibold text-primary hover:underline">
              All Products →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {categories.map((c, i) => (
              <CategoryTile key={c.slug} slug={c.slug} name={c.name} imageUrl={c.image_url} index={i} />
            ))}
          </div>
        </section>

        {bestsellers.length > 0 && (
          <section className="container mx-auto px-4 py-6 md:py-8">
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Trending</p>
                <h2 className="text-xl md:text-2xl font-extrabold">Bestsellers</h2>
              </div>
              <Link to="/search" search={{ q: "bestseller" }} className="text-sm font-semibold text-primary hover:underline">
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              {bestsellers.map((p) => (
                <ProductCard key={p.id} p={p} premium />
              ))}
            </div>
          </section>
        )}

        {flashSale.enabled && (
        <section className="container mx-auto px-4 mb-6 md:mb-8">
          <div className="rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/20 p-6 md:p-10 relative overflow-hidden">
            <div className="absolute inset-0 hero-grid opacity-[0.04]" />
            <div className="relative grid md:grid-cols-2 gap-6 md:gap-8 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold uppercase text-primary mb-2">
                  <Flash size={16} variant="Bold" /> Flash Sale
                </span>
                <h2 className="text-2xl md:text-4xl font-extrabold">{flashSale.title}</h2>
                <p className="mt-2 text-muted-foreground text-sm md:text-base">{flashSale.subtitle}</p>
                <Button asChild size="lg" className="mt-5 rounded-2xl font-bold shadow-md">
                  <Link to="/deals">Shop Deals</Link>
                </Button>
              </div>
              {deals.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {deals.slice(0, 2).map((p) => (
                    <ProductCard key={p.id} p={p} premium flashDeal />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
        )}

        <NewArrivalsCarousel products={products} />

        <PersonalizedHomeSections />

        <section className="container mx-auto px-4 py-6 md:py-8 border-y border-border/40 bg-muted/20">
          <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 max-w-3xl mx-auto">
            {trustStats.map((s) => (
              <div key={s.label} className="glass-stat-card text-center p-4 md:p-5">
                <div className="flex justify-center mb-2">
                  <s.icon size={22} color="var(--primary)" variant="Bold" />
                </div>
                <p className="text-base md:text-lg font-extrabold text-foreground">{s.value}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-wide mt-0.5">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
          <TrustBar />
        </section>

        <BrandStrip />
        <DeliveryTimelineSection />

        <section className="container mx-auto px-4 py-8 md:py-10">
          <div className="premium-card p-6 md:p-10 border-primary/10">
            <h2 className="text-xl md:text-2xl font-extrabold mb-5 text-center">Got Questions?</h2>
            <div className="grid sm:grid-cols-2 gap-3 max-w-4xl mx-auto">
              {STORE_FAQ.slice(0, 4).map((f) => (
                <div
                  key={f.q}
                  className="p-4 rounded-2xl bg-muted/50 border border-border/40 hover:border-primary/20 transition-colors"
                >
                  <p className="font-bold text-sm mb-1">{f.q}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-5">
              <Button asChild variant="outline" className="rounded-2xl">
                <Link to="/faq">View All FAQs</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-6 md:pb-8">
          <LegalTrustStrip />
        </section>
        <PaymentStrip />
      </main>
      <SiteFooter />
    </div>
  );
}
