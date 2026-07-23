import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchAllProducts } from "@/lib/products";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { ImmersiveReveal } from "@/components/animations/immersive-reveal";

export const Route = createFileRoute("/shop")({ component: ShopPage });

function ShopPage() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllProducts(250).then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <div className="relative overflow-hidden border-b bg-gradient-hero text-white">
        <div className="container mx-auto px-4 py-10 md:py-14 relative">
          <ImmersiveReveal>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Explore</p>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-1">All Products</h1>
            <p className="text-sm text-white/85 mt-2 max-w-xl">
              {loading ? "Loading catalog…" : `${products.length} products — auto-synced from Shopify`}
            </p>
          </ImmersiveReveal>
        </div>
      </div>
      <main className="flex-1 container mx-auto px-4 py-10">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square premium-card animate-pulse bg-muted" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="premium-card text-center py-16 px-6 text-muted-foreground space-y-3">
            <p className="text-base font-semibold text-foreground">No products live yet.</p>
            <p className="text-sm max-w-lg mx-auto">
              Products appear here automatically when published to the Headless (gadgetvault) channel in Shopify.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p, i) => (
              <ImmersiveReveal key={p.id} delay={Math.min(i * 30, 300)}>
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
