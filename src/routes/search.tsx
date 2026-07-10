import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ProductCard, type ProductCardData } from "@/components/product-card";
import { useCategories } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PRODUCT_CARD_SELECT } from "@/lib/product-pricing";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: (s.q as string) ?? "",
    category: (s.category as string) ?? "",
    brand: (s.brand as string) ?? "",
    sort: (s.sort as string) ?? "relevance",
    min: Number(s.min) || 0,
    max: Number(s.max) || 0,
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q, category: catFilter, sort, min, max } = Route.useSearch();
  const { categories } = useCategories();
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [localCat, setLocalCat] = useState(catFilter);
  const [localSort, setLocalSort] = useState(sort);
  const [priceMin, setPriceMin] = useState(min ? String(min) : "");
  const [priceMax, setPriceMax] = useState(max ? String(max) : "");

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from("products")
      .select(PRODUCT_CARD_SELECT)
      .eq("active", true);

    if (q.trim()) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,category.ilike.%${q}%`);
    if (localCat) query = query.eq("category", localCat);
    if (priceMin) query = query.gte("base_price", Number(priceMin));
    if (priceMax) query = query.lte("base_price", Number(priceMax));

    query.then(({ data }) => {
      let list = (data as ProductCardData[]) ?? [];
      if (localSort === "price-asc") list = [...list].sort((a, b) => a.base_price - b.base_price);
      if (localSort === "price-desc") list = [...list].sort((a, b) => b.base_price - a.base_price);
      if (localSort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
      setProducts(list);
      setLoading(false);
    });
  }, [q, localCat, localSort, priceMin, priceMax]);

  const title = useMemo(() => q ? `Results for "${q}"` : localCat ? categories.find((c) => c.slug === localCat)?.name ?? "Gadgets" : "All Gadgets", [q, localCat, categories]);

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-1">{title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{loading ? "Searching…" : `${products.length} products found`}</p>

        <div className="grid lg:grid-cols-[240px_1fr] gap-8">
          <aside className="premium-card p-5 h-fit space-y-4 lg:sticky lg:top-28">
            <h3 className="font-bold text-sm uppercase tracking-wide">Filters</h3>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={localCat || "all"} onValueChange={(v) => setLocalCat(v === "all" ? "" : v)}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Min ₹</Label>
                <Input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="mt-1 rounded-xl" placeholder="0" />
              </div>
              <div>
                <Label className="text-xs">Max ₹</Label>
                <Input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="mt-1 rounded-xl" placeholder="50000" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Sort by</Label>
              <Select value={localSort} onValueChange={setLocalSort}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => { setLocalCat(""); setPriceMin(""); setPriceMax(""); setLocalSort("relevance"); }}>
              Clear filters
            </Button>
          </aside>

          <div>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square premium-card animate-pulse bg-muted" />)}</div>
            ) : products.length === 0 ? (
              <div className="premium-card text-center py-16 text-muted-foreground">
                No gadgets found. <Link to="/" className="text-primary font-semibold">Browse all →</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {products.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
