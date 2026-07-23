import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchProductsByCategory } from "@/lib/products";
import { fetchCategoryBySlug } from "@/lib/categories";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { getCategoryImage } from "@/components/category-tile";
import { ImmersiveReveal } from "@/components/animations/immersive-reveal";

export const Route = createFileRoute("/category/$category")({ component: CategoryPage });

function CategoryPage() {
  const { category } = useParams({ from: "/category/$category" });
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCategoryBySlug(category), fetchProductsByCategory(category)]).then(([cat, data]) => {
      setTitle(cat?.name ?? category);
      setDescription(cat?.description ?? null);
      setImageUrl(getCategoryImage(category, cat?.image_url) || null);
      setProducts(data);
      setLoading(false);
    });
  }, [category]);

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <div className="relative overflow-hidden border-b bg-gradient-hero text-white">
        {imageUrl && (
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="container mx-auto px-4 py-10 md:py-14 relative">
          <ImmersiveReveal>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Category</p>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-1">{title}</h1>
            <p className="text-sm text-white/85 mt-2 max-w-xl">
              {description ?? `${products.length} premium products`}
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
            <p className="text-base font-semibold text-foreground">No products in this category yet.</p>
            <p className="text-sm max-w-lg mx-auto">
              Products in this collection appear automatically when assigned to this Shopify collection and published to Headless (gadgetvault).
            </p>
            <p className="text-xs">
              Shopify Admin → Product → Collections → assign collection → Publishing → Headless ✓
            </p>
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
