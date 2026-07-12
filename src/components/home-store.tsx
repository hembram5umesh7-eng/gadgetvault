import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { ImmersiveReveal } from "@/components/animations/immersive-reveal";
import { type HeroSlide } from "@/components/animations/hero-3d-slider";
import { PRODUCT_CARD_SELECT } from "@/lib/product-pricing";
import { STORE_FAQ } from "@/lib/faq-data";
import { Flash, Cpu, FlashCircle, Category, ShieldTick, Truck } from "iconsax-react";

const HERO_SLIDES: HeroSlide[] = [
  { id: "1", title: "Kitchen Essentials", subtitle: "Smart organizers & tools", price: "From ₹299", image: "https://images.unsplash.com/photo-1556911223-bff03130eb78?w=800&q=80", category: "kitchen-accessories", accent: "" },
  { id: "2", title: "Unique Gadgets", subtitle: "Innovative finds for daily life", price: "Shop now", image: "https://images.unsplash.com/photo-1585819409453-0e95a44c0d34?w=800&q=80", category: "unique-gadgets", accent: "" },
  { id: "3", title: "Daily Necessities", subtitle: "Must-haves at best prices", price: "Free ship ₹999+", image: "https://images.unsplash.com/photo-1585771724684-e3823f9ee8ef?w=800&q=80", category: "necessities", accent: "" },
];

const QUICK_CATS = [
  { icon: Category, label: "Kitchen", slug: "kitchen-accessories" },
  { icon: Cpu, label: "Gadgets", slug: "unique-gadgets" },
  { icon: FlashCircle, label: "Essentials", slug: "necessities" },
];

const TRUST_STATS = [
  { icon: ShieldTick, value: "Razorpay", label: "Secure payments" },
  { icon: Truck, value: "Pan-India", label: "Delivery coverage" },
  { icon: Flash, value: "3", label: "Curated categories" },
];

export function HomeStore() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [bestsellers, setBestsellers] = useState<ProductCardData[]>([]);
  const [deals, setDeals] = useState<ProductCardData[]>([]);
  const [productCount, setProductCount] = useState(0);
  const { categories } = useCategories();
  const select = PRODUCT_CARD_SELECT;

  useEffect(() => {
    Promise.all([
      supabase.from("products").select(select).eq("active", true).order("created_at", { ascending: false }).limit(8),
      supabase.from("products").select(select).eq("active", true).eq("is_bestseller", true).limit(4),
      supabase.from("products").select(select).eq("active", true).eq("is_deal", true).limit(4),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("active", true),
    ]).then(([all, best, deal, countRes]) => {
      setProducts((all.data as ProductCardData[]) ?? []);
      setBestsellers((best.data as ProductCardData[]) ?? []);
      setDeals((deal.data as ProductCardData[]) ?? []);
      setProductCount(countRes.count ?? 0);
    });
  }, []);

  const defaultCategory = categories[0]?.slug ?? "kitchen-accessories";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <FuturisticHero slides={HERO_SLIDES} defaultCategory={defaultCategory} productCount={productCount} />

        <section className="container mx-auto px-4 -mt-8 relative z-20 mb-2">
          <div className="premium-card p-3 md:p-4 grid grid-cols-4 gap-1 md:gap-3 shadow-elegant border-primary/10">
            {QUICK_CATS.map((c) => (
              <Link
                key={c.slug}
                to="/category/$category"
                params={{ category: c.slug }}
                className="group flex flex-col items-center gap-1.5 p-2 md:p-3 rounded-xl hover:bg-primary/5 transition-all text-center"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 group-hover:scale-105 transition-transform">
                  <c.icon size={24} color="var(--primary)" variant="Bold" />
                </div>
                <span className="text-[11px] md:text-xs font-bold text-foreground">{c.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {TRUST_STATS.map((s) => (
              <div key={s.label} className="glass-stat-card text-center p-4 md:p-5">
                <div className="flex justify-center mb-2">
                  <s.icon size={22} color="var(--primary)" variant="Bold" />
                </div>
                <p className="text-lg md:text-xl font-extrabold text-foreground">{s.value}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-wide mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-4 md:py-6">
          <TrustBar />
        </section>

        <DeliveryTimelineSection />

        {bestsellers.length > 0 && (
          <section className="container mx-auto px-4 py-6 md:py-8">
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Trending</p>
                <h2 className="text-xl md:text-2xl font-extrabold">Bestsellers</h2>
              </div>
              <Link to="/search" search={{ q: "gadget" }} className="text-sm font-semibold text-primary hover:underline">View All →</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              {bestsellers.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          </section>
        )}

        <BrandStrip />

        <section className="container mx-auto px-4 py-8 md:py-10">
          <h2 className="text-xl md:text-2xl font-extrabold mb-5">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {categories.map((c, i) => (
              <CategoryTile key={c.slug} slug={c.slug} name={c.name} imageUrl={c.image_url} index={i} />
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 mb-6 md:mb-8">
          <div className="rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/20 p-6 md:p-10 relative overflow-hidden">
            <div className="absolute inset-0 hero-grid opacity-[0.04]" />
            <div className="relative grid md:grid-cols-2 gap-6 md:gap-8 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold uppercase text-primary mb-2">
                  <Flash size={16} variant="Bold" /> Flash Sale
                </span>
                <h2 className="text-2xl md:text-4xl font-extrabold">Deals on Gadgets</h2>
                <p className="mt-2 text-muted-foreground text-sm md:text-base">Limited-time offers on selected products</p>
                <Button asChild size="lg" className="mt-5 rounded-2xl font-bold shadow-md">
                  <Link to="/deals">Shop Deals</Link>
                </Button>
              </div>
              {deals.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {deals.slice(0, 2).map((p) => <ProductCard key={p.id} p={p} />)}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8 md:py-10">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Fresh drops</p>
              <h2 className="text-xl md:text-2xl font-extrabold">New Arrivals</h2>
            </div>
            <Link to="/category/$category" params={{ category: defaultCategory }} className="text-sm font-semibold text-primary hover:underline">View All →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {products.map((p, i) => (
              <ImmersiveReveal key={p.id} delay={i * 30}>
                <ProductCard p={p} />
              </ImmersiveReveal>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-8 md:py-10">
          <div className="premium-card p-6 md:p-10 border-primary/10">
            <h2 className="text-xl md:text-2xl font-extrabold mb-5 text-center">Got Questions?</h2>
            <div className="grid sm:grid-cols-2 gap-3 max-w-4xl mx-auto">
              {STORE_FAQ.slice(0, 4).map((f) => (
                <div key={f.q} className="p-4 rounded-2xl bg-muted/50 border border-border/40 hover:border-primary/20 transition-colors">
                  <p className="font-bold text-sm mb-1">{f.q}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-5">
              <Button asChild variant="outline" className="rounded-2xl"><Link to="/faq">View All FAQs</Link></Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-8 md:pb-10">
          <LegalTrustStrip />
        </section>

        <PaymentStrip />
      </main>
      <SiteFooter />
    </div>
  );
}
