import { Link } from "@tanstack/react-router";
import { GADGET_BRANDS } from "@/lib/brands";

const BRAND_COLORS: Record<string, string> = {
  boat: "bg-red-600",
  noise: "bg-emerald-600",
  oneplus: "bg-red-500",
  samsung: "bg-blue-700",
  apple: "bg-neutral-800",
  realme: "bg-yellow-500",
  mi: "bg-orange-500",
  portronics: "bg-indigo-600",
};

export function BrandStrip() {
  return (
    <section className="container mx-auto px-4 py-10">
      <h2 className="text-xl md:text-2xl font-extrabold mb-6 text-center">Shop Top Brands</h2>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        {GADGET_BRANDS.map((b) => (
          <Link
            key={b.slug}
            to="/search"
            search={{ q: b.name }}
            className="premium-card flex flex-col items-center justify-center p-3 md:p-4 hover:shadow-elegant transition-all hover:-translate-y-0.5 gap-2 min-h-[88px]"
          >
            <div className={`w-10 h-10 rounded-xl ${BRAND_COLORS[b.slug] ?? "bg-primary"} flex items-center justify-center text-white text-sm font-extrabold shrink-0`}>
              {b.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-[11px] md:text-xs font-bold text-center leading-tight">{b.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
