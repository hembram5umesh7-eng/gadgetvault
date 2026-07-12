import { Link } from "@tanstack/react-router";
import { Clock, SearchNormal1, MagicStar } from "iconsax-react";
import { PremiumProductSection } from "@/components/premium-product-section";
import { usePersonalizedHome } from "@/lib/use-personalized-home";
import { clearRecentSearches } from "@/lib/user-personalization";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function PersonalizedHomeSections() {
  const { user } = useAuth();
  const { recentlyViewed, recommended, recentSearches, loading, hasPersonalization } =
    usePersonalizedHome();

  if (loading) return null;
  if (!recentSearches.length && !recentlyViewed.length && !(recommended.length && hasPersonalization)) {
    return null;
  }

  return (
    <div className="space-y-8 md:space-y-10">
      {recentSearches.length > 0 && (
        <section className="container mx-auto px-4">
          <div className="rounded-2xl border border-primary/10 bg-muted/30 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <SearchNormal1 size={18} variant="Bold" color="var(--primary)" />
                <h3 className="font-bold text-sm md:text-base">Your recent searches</h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => clearRecentSearches(user?.id ?? null)}
              >
                Clear
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((s) => (
                <Link
                  key={`${s.query}-${s.searchedAt}`}
                  to="/search"
                  search={{ q: s.query, category: s.category ?? "" }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-border/60 text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <span>{s.query}</span>
                  <span className="text-[10px] text-muted-foreground">{formatRelativeTime(s.searchedAt)}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {recentlyViewed.length > 0 && (
        <div className="container mx-auto px-4">
          <PremiumProductSection
            eyebrow="For you"
            title="Recently Viewed"
            subtitle="Pick up where you left off — your browsing history, unique to you."
            products={recentlyViewed}
            layout="rail"
            icon={<Clock size={22} variant="Bold" color="var(--primary)" />}
          />
        </div>
      )}

      {recommended.length > 0 && hasPersonalization && (
        <div className="container mx-auto px-4">
          <PremiumProductSection
            eyebrow="Curated for you"
            title="Recommended For You"
            subtitle="Based on what you viewed and searched — different for every shopper."
            products={recommended}
            layout="grid"
            icon={<MagicStar size={22} variant="Bold" color="var(--primary)" />}
            viewAll={
              recentSearches[0]?.query ? (
                <Link
                  to="/search"
                  search={{ q: recentSearches[0].query }}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                >
                  View All →
                </Link>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
