import { Link } from "@tanstack/react-router";
import { formatINR } from "@/lib/order-utils";
import { productDiscountPercent, productMrp } from "@/lib/product-pricing";
import { Flash } from "iconsax-react";

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  marketing_price?: number | null;
  images: string[] | null;
  category: string;
  brand?: string | null;
  is_deal?: boolean;
  is_bestseller?: boolean;
}

export function ProductCard({ p }: { p: ProductCardData }) {
  const img = p.images?.[0] ?? "";
  const mrp = productMrp(p.base_price, p.marketing_price);
  const discount = productDiscountPercent(p.base_price, p.marketing_price);

  return (
    <Link
      to="/product/$slug"
      params={{ slug: p.slug }}
      className="group premium-card flex flex-col overflow-hidden hover:shadow-elegant transition-all duration-300 hover:-translate-y-0.5"
    >
      <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-muted to-muted/50 p-4">
        {img ? (
          <img
            src={img}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-md"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-muted to-secondary rounded-lg" />
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {p.is_bestseller && (
            <span className="bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded-lg">BESTSELLER</span>
          )}
          {discount > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-0.5 w-fit">
              <Flash size={10} variant="Bold" /> {discount}% OFF
            </span>
          )}
        </div>
      </div>
      <div className="p-4 pt-3 flex flex-col flex-1">
        {p.brand && <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{p.brand}</p>}
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80 capitalize">{p.category.replace(/-/g, " ")}</p>
        <h3 className="font-bold text-sm line-clamp-2 mt-1 leading-snug group-hover:text-primary transition-colors">{p.name}</h3>
        <div className="mt-auto pt-3 flex items-baseline gap-2">
          <span className="font-extrabold text-lg">{formatINR(p.base_price)}</span>
          {mrp > p.base_price && (
            <span className="text-xs text-muted-foreground line-through">{formatINR(mrp)}</span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">incl. GST · EMI available</p>
      </div>
    </Link>
  );
}
