import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useWishlist } from "@/lib/wishlist-context";
import { formatINR } from "@/lib/order-utils";
import { Button } from "@/components/ui/button";
import { Heart, Trash } from "iconsax-react";

export const Route = createFileRoute("/wishlist")({ component: WishlistPage });

function WishlistPage() {
  const { items, remove } = useWishlist();

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-6 flex items-center gap-2">
          <Heart size={28} className="text-primary" variant="Bold" /> My Wishlist
        </h1>

        {items.length === 0 ? (
          <div className="premium-card text-center py-16">
            <Heart size={48} className="mx-auto text-muted-foreground/40 mb-4" />
            <p className="font-semibold mb-2">Your wishlist is empty</p>
            <Button asChild><Link to="/">Discover Gadgets</Link></Button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.productId} className="premium-card flex gap-4 p-4 items-center">
                <div className="w-20 h-20 rounded-xl bg-muted p-2 shrink-0">
                  {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-contain" />}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to="/product/$slug" params={{ slug: item.slug }} className="font-bold hover:text-primary line-clamp-1">
                    {item.name}
                  </Link>
                  <p className="font-extrabold mt-1">{formatINR(item.price)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button asChild size="sm" className="rounded-xl">
                    <Link to="/product/$slug" params={{ slug: item.slug }}>View</Link>
                  </Button>
                  <button type="button" onClick={() => remove(item.productId)} className="p-2 text-muted-foreground hover:text-destructive">
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
