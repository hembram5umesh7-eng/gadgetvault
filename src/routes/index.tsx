import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { CategoryTile } from "@/components/category-tile";
import { BrandStrip } from "@/components/brand-strip";
import { TrustBar, PaymentStrip } from "@/components/gadget-trust";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/lib/categories";
import { ImmersiveReveal } from "@/components/animations/immersive-reveal";
import { Hero3DSlider, type HeroSlide } from "@/components/animations/hero-3d-slider";
import { STORE_FAQ } from "@/lib/faq-data";
import { Flash, Cpu, Headphone, FlashCircle, Watch, Category } from "iconsax-react";

export const Route = createFileRoute("/")({ component: Home });

const HERO_SLIDES: HeroSlide[] = [
  { id: "1", title: "Pro TWS Earbuds X3", subtitle: "boAt · ANC · 40hr Battery", price: "From ₹2,499", image: "https://images.unsplash.com/photo-1590658268037-6bf9d7a3d96f?w=800&q=80", category: "audio", accent: "" },
  { id: "2", title: "Smart Watch Pro S", subtitle: "Noise · AMOLED · GPS", price: "From ₹3,999", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80", category: "smartwatches", accent: "" },
  { id: "3", title: "65W GaN Fast Charger", subtitle: "Portronics · Dual Port", price: "From ₹1,899", image: "https://images.unsplash.com/photo-1583394838336-acd977736298?w=800&q=80", category: "chargers", accent: "" },
];

const QUICK_CATS = [
  { icon: Headphone, label: "Audio", slug: "audio" },
  { icon: FlashCircle, label: "Chargers", slug: "chargers" },
  { icon: Watch, label: "Watches", slug: "smartwatches" },
  { icon: Category, label: "Accessories", slug: "accessories" },
];

function Home() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [bestsellers, setBestsellers] = useState<ProductCardData[]>([]);
  const [deals, setDeals] = useState<ProductCardData[]>([]);
  const { categories } = useCategories();
  const select = "id,name,slug,base_price,images,category,brand,is_bestseller,is_deal";

  useEffect(() => {
    Promise.all([
      supabase.from("products").select(select).eq("active", true).order("created_at", { ascending: false }).limit(8),
      supabase.from("products").select(select).eq("active", true).eq("is_bestseller", true).limit(4),
      supabase.from("products").select(select).eq("active", true).eq("is_deal", true).limit(4),
    ]).then(([all, best, deal]) => {
      setProducts((all.data as ProductCardData[]) ?? []);
      setBestsellers((best.data as ProductCardData[]) ?? []);
      setDeals((deal.data as ProductCardData[]) ?? []);
    });
  }, []);

  const defaultCategory = categories[0]?.slug ?? "audio";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-hero text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_55%)]" />
          <div className="container mx-auto px-4 py-10 md:py-14 relative">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="order-2 lg:order-1">
                <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider">
                  <Cpu size={14} color="#fff" variant="Bold" /> India&apos;s #1 Gadget Destination
                </span>
                <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1]">
                  Smart Gadgets.<br />Best Prices.<br />Zero Compromise.
                </h1>
                <p className="mt-4 text-base md:text-lg text-white/90 max-w-lg">
                  Earbuds, smartwatches, chargers, power banks & accessories — 100% genuine with official warranty.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 font-bold rounded-xl">
                    <Link to="/category/$category" params={{ category: defaultCategory }}>Shop Gadgets →</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="bg-transparent border-white/60 text-white hover:bg-white/10 rounded-xl">
                    <Link to="/deals">Today&apos;s Deals</Link>
                  </Button>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <Hero3DSlider slides={HERO_SLIDES} />
              </div>
            </div>
          </div>
        </section>

        {/* Quick links */}
        <section className="container mx-auto px-4 -mt-5 relative z-10 mb-2">
          <div className="premium-card p-3 md:p-4 grid grid-cols-4 gap-1 md:gap-3 shadow-md">
            {QUICK_CATS.map((c) => (
              <Link
                key={c.slug}
                to="/category/$category"
                params={{ category: c.slug }}
                className="flex flex-col items-center gap-1.5 p-2 md:p-3 rounded-xl hover:bg-primary/5 transition-colors text-center"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <c.icon size={24} color="var(--primary)" variant="Bold" />
                </div>
                <span className="text-[11px] md:text-xs font-bold text-foreground">{c.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-6 md:py-8">
          <TrustBar />
        </section>

        {bestsellers.length > 0 && (
          <section className="container mx-auto px-4 py-6 md:py-8">
            <div className="flex items-end justify-between mb-5">
              <h2 className="text-xl md:text-2xl font-extrabold">Bestsellers</h2>
              <Link to="/search" search={{ q: "boat" }} className="text-sm font-semibold text-primary">View All →</Link>
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
          <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-violet-500/10 border border-primary/15 p-6 md:p-10">
            <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold uppercase text-primary mb-2">
                  <Flash size={16} variant="Bold" /> Flash Sale
                </span>
                <h2 className="text-2xl md:text-4xl font-extrabold">Up to 40% Off Tech</h2>
                <p className="mt-2 text-muted-foreground text-sm md:text-base">Limited-time deals on earbuds, watches & chargers</p>
                <Button asChild size="lg" className="mt-5 rounded-xl font-bold">
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
            <h2 className="text-xl md:text-2xl font-extrabold">New Arrivals</h2>
            <Link to="/category/$category" params={{ category: defaultCategory }} className="text-sm font-semibold text-primary">View All →</Link>
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
          <div className="premium-card p-6 md:p-10">
            <h2 className="text-xl md:text-2xl font-extrabold mb-5 text-center">Got Questions?</h2>
            <div className="grid sm:grid-cols-2 gap-3 max-w-4xl mx-auto">
              {STORE_FAQ.slice(0, 4).map((f) => (
                <div key={f.q} className="p-4 rounded-xl bg-muted/50 border border-border/40">
                  <p className="font-bold text-sm mb-1">{f.q}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-5">
              <Button asChild variant="outline" className="rounded-xl"><Link to="/faq">View All FAQs</Link></Button>
            </div>
          </div>
        </section>

        <PaymentStrip />
      </main>
      <SiteFooter />
    </div>
  );
}
