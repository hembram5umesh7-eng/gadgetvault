import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Sparkles, Truck, ShieldCheck, Palette } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

const CATEGORIES = [
  { label: "T-Shirts", slug: "tshirt", img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400", color: "bg-brand-yellow" },
  { label: "Hoodies", slug: "hoodie", img: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400", color: "bg-brand-mint" },
  { label: "Jeans", slug: "jeans", img: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400", color: "bg-brand-violet" },
  { label: "Shirts", slug: "shirt", img: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400", color: "bg-brand-coral" },
];

function Home() {
  const [products, setProducts] = useState<ProductCardData[]>([]);

  useEffect(() => {
    supabase
      .from("products")
      .select("id,name,slug,base_price,images,category,customizable")
      .eq("active", true)
      .limit(12)
      .then(({ data }) => setProducts((data as ProductCardData[]) ?? []));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-hero text-white">
          <div className="container mx-auto px-4 py-16 md:py-24 grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" /> India's #1 Custom Fashion Studio
              </span>
              <h1 className="mt-4 text-4xl md:text-6xl font-extrabold leading-tight">
                Design it.<br />Wear it.<br />Own it.
              </h1>
              <p className="mt-4 text-lg text-white/90 max-w-md">
                Customize premium tees, hoodies & shirts with your own art, text, or logo. Made-to-order in 5 days.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 font-bold">
                  <Link to="/customize">Start Designing →</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                  <Link to="/category/tshirt">Shop Collection</Link>
                </Button>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="aspect-square rounded-3xl bg-white/10 backdrop-blur border border-white/20 p-8">
                <img
                  src="https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600"
                  alt="Custom fashion"
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-b">
          <div className="container mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { icon: Palette, label: "Live Customizer" },
              { icon: Truck, label: "5-Day Delivery" },
              { icon: ShieldCheck, label: "Premium Fabrics" },
              { icon: Sparkles, label: "Made to Order" },
            ].map((it) => (
              <div key={it.label} className="flex items-center justify-center gap-2">
                <it.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">{it.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-6">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                to="/category/$category"
                params={{ category: c.slug }}
                className={`group relative overflow-hidden rounded-2xl ${c.color} aspect-square flex items-end p-4 hover:shadow-elegant transition-all`}
              >
                <img src={c.img} alt={c.label} className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-80 group-hover:scale-110 transition-transform duration-500" />
                <h3 className="relative text-2xl font-extrabold text-foreground drop-shadow">{c.label}</h3>
              </Link>
            ))}
          </div>
        </section>

        {/* Promo */}
        <section className="container mx-auto px-4 my-8">
          <div className="bg-gradient-sale rounded-3xl p-8 md:p-12 text-center text-foreground">
            <h2 className="text-3xl md:text-5xl font-extrabold">UNLEASH YOUR STYLE</h2>
            <p className="mt-2 text-lg font-medium">Add text, upload logos, drag & drop on a live 3D-style preview.</p>
            <Button asChild size="lg" className="mt-6 bg-foreground text-background hover:bg-foreground/90 font-bold">
              <Link to="/customize">Open Design Studio</Link>
            </Button>
          </div>
        </section>

        {/* Trending */}
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-extrabold">Trending Now 🔥</h2>
            <Link to="/category/$category" params={{ category: "tshirt" }} className="text-sm font-semibold text-primary">View All →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
