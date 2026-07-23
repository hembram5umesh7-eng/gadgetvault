import { Link } from "@tanstack/react-router";
import { FeatureCarousel, type FeatureCarouselImage } from "@/components/ui/feature-carousel";
import type { ProductCardData } from "@/components/product-card";
import { formatINR } from "@/lib/order-utils";

interface NewArrivalsCarouselProps {
  products: ProductCardData[];
}

function toCarouselItems(products: ProductCardData[]): FeatureCarouselImage[] {
  return products
    .filter((p) => p.images?.[0])
    .slice(0, 8)
    .map((p) => ({
      src: p.images![0],
      alt: p.name,
      caption: p.name,
      price: formatINR(p.base_price),
      categoryLabel: p.category.replace(/-/g, " "),
      href: "/product/$slug",
      hrefParams: { slug: p.slug },
    }));
}

export function NewArrivalsCarousel({ products }: NewArrivalsCarouselProps) {
  const images = toCarouselItems(products);
  if (images.length === 0) return null;

  return (
    <section className="container mx-auto px-3 sm:px-4 py-10 md:py-14 overflow-hidden">
      <FeatureCarousel
        title={
          <>
            New{" "}
            <span className="text-primary">Arrivals</span>
          </>
        }
        subtitle="Latest gadgets added to the vault — swipe through our freshest drops."
        images={images}
        autoPlayMs={5000}
        viewAll={
          <Link to="/shop" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
            View All →
          </Link>
        }
      />
    </section>
  );
}
