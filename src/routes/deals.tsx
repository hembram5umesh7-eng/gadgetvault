import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { ImmersiveReveal } from "@/components/animations/immersive-reveal";
import { fetchFlashSaleCatalog } from "@/lib/flash-sale-client";
import { DEFAULT_FLASH_SALE, type FlashSaleSettings } from "@/lib/flash-sale-settings";
import { Flash } from "iconsax-react";

export const Route = createFileRoute("/deals")({ component: DealsPage });

function DealsPage() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [settings, setSettings] = useState<FlashSaleSettings>(DEFAULT_FLASH_SALE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchFlashSaleCatalog().then((res) => {
      setSettings(res.settings);
      setProducts(res.products);
      setLoaded(true);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <div className="bg-gradient-sale border-b">
        <div className="container mx-auto px-4 py-12 text-center">
          <span className="inline-flex items-center gap-1 text-sm font-bold uppercase tracking-wider text-primary mb-2">
            <Flash size={16} variant="Bold" /> Limited Time
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold">{settings.title}</h1>
          <p className="text-muted-foreground mt-2">{settings.subtitle}</p>
        </div>
      </div>
      <main className="flex-1 container mx-auto px-4 py-10">
        {!loaded ? (
          <div className="premium-card text-center py-16 text-muted-foreground">Loading deals…</div>
        ) : !settings.enabled || products.length === 0 ? (
          <div className="premium-card text-center py-16 text-muted-foreground">
            No active deals right now. <Link to="/" className="text-primary font-semibold">Browse all gadgets →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p, i) => (
              <ImmersiveReveal key={p.id} delay={i * 40}>
                <ProductCard p={p} flashDeal />
              </ImmersiveReveal>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
