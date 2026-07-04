import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useCompare } from "@/lib/compare-context";
import { formatINR } from "@/lib/order-utils";
import { ProductSpecsTable } from "@/components/product-specs-table";
import { Button } from "@/components/ui/button";
import { Trash } from "iconsax-react";

export const Route = createFileRoute("/compare")({ component: ComparePage });

function ComparePage() {
  const { items, remove, clear, max } = useCompare();

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">Compare Products</h1>
            <p className="text-sm text-muted-foreground mt-1">Compare up to {max} gadgets side by side</p>
          </div>
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={clear}>Clear all</Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="premium-card text-center py-16">
            <p className="text-lg font-semibold mb-2">No products to compare</p>
            <p className="text-sm text-muted-foreground mb-4">Add gadgets from product pages using &quot;Compare&quot;</p>
            <Button asChild><Link to="/">Browse Gadgets</Link></Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(260px, 1fr))` }}>
              {items.map((p) => (
                <div key={p.productId} className="premium-card p-4 min-w-[260px]">
                  <button type="button" onClick={() => remove(p.productId)} className="ml-auto flex text-muted-foreground hover:text-destructive mb-2">
                    <Trash size={16} />
                  </button>
                  <div className="aspect-square bg-muted rounded-xl p-4 mb-3">
                    {p.image && <img src={p.image} alt={p.name} className="w-full h-full object-contain" />}
                  </div>
                  <Link to="/product/$slug" params={{ slug: p.slug }} className="font-bold text-sm hover:text-primary line-clamp-2">
                    {p.name}
                  </Link>
                  <p className="text-xl font-extrabold mt-2">{formatINR(p.price)}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-1">{p.category}</p>
                  <div className="mt-4">
                    <ProductSpecsTable specs={p.specs} />
                  </div>
                  <Button asChild className="w-full mt-4 rounded-xl" size="sm">
                    <Link to="/product/$slug" params={{ slug: p.slug }}>View Product</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
