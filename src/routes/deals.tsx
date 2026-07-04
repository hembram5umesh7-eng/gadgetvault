import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { ImmersiveReveal } from "@/components/animations/immersive-reveal";
import { Flash } from "iconsax-react";

export const Route = createFileRoute("/deals")({ component: DealsPage });

function DealsPage() {
  const [products, setProducts] = useState<ProductCardData[]>([]);

  useEffect(() => {
    supabase
      .from("products")
      .select("id,name,slug,base_price,images,category,brand,is_deal")
      .eq("active", true)
      .eq("is_deal", true)
      .order("base_price")
      .then(({ data }) => setProducts((data as ProductCardData[]) ?? []));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <div className="bg-gradient-sale border-b">
        <div className="container mx-auto px-4 py-12 text-center">
          <span className="inline-flex items-center gap-1 text-sm font-bold uppercase tracking-wider text-primary mb-2">
            <Flash size={16} variant="Bold" /> Limited Time
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold">Tech Deals & Offers</h1>
          <p className="text-muted-foreground mt-2">Best discounts on earbuds, chargers, watches & more</p>
        </div>
      </div>
      <main className="flex-1 container mx-auto px-4 py-10">
        {products.length === 0 ? (
          <div className="premium-card text-center py-16 text-muted-foreground">
            No active deals right now. <Link to="/" className="text-primary font-semibold">Browse all gadgets →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p, i) => (
              <ImmersiveReveal key={p.id} delay={i * 40}>
                <ProductCard p={p} />
              </ImmersiveReveal>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
