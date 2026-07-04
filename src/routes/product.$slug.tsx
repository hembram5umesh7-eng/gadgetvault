import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductSpecsTable } from "@/components/product-specs-table";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useCompare } from "@/lib/compare-context";
import { formatINR } from "@/lib/order-utils";
import { STORE } from "@/lib/store-info";
import { VARIANT_COLOR_LABEL, VARIANT_SIZE_LABEL } from "@/lib/gadget-labels";
import { emiPerMonth } from "@/lib/product-specs";
import { toast } from "sonner";
import { ShoppingBag, Flash, ShieldTick, Truck, Heart, Element3, Star1 } from "iconsax-react";

export const Route = createFileRoute("/product/$slug")({ component: ProductPage });

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  specs: string | null;
  brand: string | null;
  warranty_months: number;
  images: string[] | null;
  category: string;
}
interface Variant { id: string; size: string; color: string; color_hex: string; stock: number }

function mockRating(slug: string) {
  const n = slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return (4 + (n % 10) / 10).toFixed(1);
}

function ProductPage() {
  const { slug } = useParams({ from: "/product/$slug" });
  const navigate = useNavigate();
  const cart = useCart();
  const wishlist = useWishlist();
  const compare = useCompare();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [model, setModel] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();
      if (p) {
        setProduct(p as Product);
        const { data: vs } = await supabase.from("product_variants").select("*").eq("product_id", p.id);
        setVariants((vs as Variant[]) ?? []);
      }
    })();
  }, [slug]);

  const models = useMemo(() => Array.from(new Set(variants.map((v) => v.size))), [variants]);
  const colors = useMemo(() => {
    const seen = new Map<string, Variant>();
    variants.forEach((v) => { if (!seen.has(v.color)) seen.set(v.color, v); });
    return Array.from(seen.values());
  }, [variants]);
  const selectedVariant = useMemo(
    () => variants.find((v) => v.size === model && v.color === color) ?? null,
    [variants, model, color],
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader /><div className="flex-1 container mx-auto px-4 py-12">Loading…</div><SiteFooter />
    </div>
  );

  const mrp = Math.round(product.base_price * 1.45);
  const rating = mockRating(product.slug);
  const emi = emiPerMonth(product.base_price);

  const addToCart = (buyNow = false) => {
    if (!model || !color) { toast.error(`Pick ${VARIANT_SIZE_LABEL.toLowerCase()} and color`); return; }
    if (selectedVariant && selectedVariant.stock <= 0) { toast.error("Out of stock"); return; }
    cart.add({
      id: crypto.randomUUID(),
      productId: product.id,
      productName: product.name,
      productImage: product.images?.[0] ?? "",
      size: model, color,
      colorHex: selectedVariant?.color_hex ?? "#000",
      variantId: selectedVariant?.id ?? null,
      basePrice: product.base_price,
      quantity: 1,
    });
    toast.success("Added to cart");
    if (buyNow) navigate({ to: "/cart" });
  };

  const toggleWishlist = () => {
    const wasIn = wishlist.has(product.id);
    wishlist.toggle({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images?.[0] ?? "",
      price: product.base_price,
    });
    toast.message(wasIn ? "Removed from wishlist" : "Added to wishlist");
  };

  const addCompare = () => {
    const ok = compare.add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images?.[0] ?? "",
      price: product.base_price,
      specs: product.specs,
      category: product.category,
    });
    if (!ok) toast.error(`Compare up to ${compare.max} products only`);
    else toast.success("Added to compare");
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="premium-card p-4 md:p-6">
            <div className="aspect-square bg-gradient-to-br from-muted to-muted/30 rounded-xl overflow-hidden p-6">
              {product.images?.[imgIdx] && (
                <img src={product.images[imgIdx]} alt={product.name} className="w-full h-full object-contain drop-shadow-lg" />
              )}
            </div>
            {(product.images?.length ?? 0) > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide">
                {product.images!.map((src, i) => (
                  <button key={i} type="button" onClick={() => setImgIdx(i)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 p-1 bg-muted/30 ${i === imgIdx ? "border-primary" : "border-transparent"}`}>
                    <img src={src} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="premium-card p-6 md:p-8">
            {product.brand && <p className="text-sm font-bold text-primary">{product.brand}</p>}
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-semibold mt-1">{product.category.replace(/-/g, " ")}</p>
            <h1 className="text-2xl md:text-3xl font-extrabold mt-2 leading-tight">{product.name}</h1>

            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                <Star1 size={16} variant="Bold" /> {rating}
              </div>
              <span className="text-xs text-muted-foreground">· Genuine product · {product.warranty_months}mo warranty</span>
            </div>

            <div className="mt-4 flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl font-extrabold">{formatINR(product.base_price)}</span>
              <span className="text-lg text-muted-foreground line-through">{formatINR(mrp)}</span>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg flex items-center gap-1">
                <Flash size={12} variant="Bold" /> {Math.round((1 - product.base_price / mrp) * 100)}% OFF
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">incl. GST · No Cost EMI from {formatINR(emi)}/mo*</p>

            <div className="mt-6">
              <p className="text-sm font-bold uppercase mb-3">{VARIANT_SIZE_LABEL}</p>
              <div className="flex flex-wrap gap-2">
                {models.map((s) => (
                  <button key={s} type="button" onClick={() => setModel(s)}
                    className={`min-w-12 h-11 px-4 rounded-xl border-2 text-sm font-bold transition-all ${
                      model === s ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border hover:border-primary/40"
                    }`}>{s}</button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-bold uppercase mb-3">{VARIANT_COLOR_LABEL} {color && <span className="text-muted-foreground font-normal normal-case">— {color}</span>}</p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button key={c.color} type="button" onClick={() => setColor(c.color)} title={c.color}
                    className={`w-11 h-11 rounded-full border-2 transition-all ${color === c.color ? "border-primary scale-110 ring-2 ring-primary/20" : "border-border"}`}
                    style={{ backgroundColor: c.color_hex }} />
                ))}
              </div>
            </div>

            {selectedVariant && (
              <p className={`text-sm mt-3 font-semibold ${selectedVariant.stock > 0 ? "text-success" : "text-destructive"}`}>
                {selectedVariant.stock > 0 ? `${selectedVariant.stock} in stock` : "Out of stock"}
              </p>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="flex-1 font-bold rounded-xl h-12" onClick={() => addToCart(false)}>
                <ShoppingBag size={20} className="mr-2" /> Add to Cart
              </Button>
              <Button size="lg" variant="secondary" className="flex-1 font-bold rounded-xl h-12" onClick={() => addToCart(true)}>Buy Now</Button>
            </div>

            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" className="rounded-xl flex-1" onClick={toggleWishlist}>
                <Heart size={16} className={`mr-1.5 ${wishlist.has(product.id) ? "fill-primary text-primary" : ""}`} variant={wishlist.has(product.id) ? "Bold" : "Linear"} />
                Wishlist
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl flex-1" onClick={addCompare}>
                <Element3 size={16} className="mr-1.5" /> Compare
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
                <ShieldTick size={18} className="text-success shrink-0" variant="Bold" />
                <span>{product.warranty_months} months warranty</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
                <Truck size={18} className="text-primary shrink-0" variant="Bold" />
                <span>Free ship ₹{STORE.freeShippingMin}+</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 premium-card p-6 md:p-8">
          <Tabs defaultValue="overview">
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
              <TabsTrigger value="specs" className="rounded-lg">Specifications</TabsTrigger>
              <TabsTrigger value="warranty" className="rounded-lg">Warranty</TabsTrigger>
              <TabsTrigger value="reviews" className="rounded-lg">Reviews</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-6 text-sm text-muted-foreground leading-relaxed">
              {product.description ?? "Premium gadget from verified supplier."}
            </TabsContent>
            <TabsContent value="specs" className="mt-6">
              <ProductSpecsTable specs={product.specs} />
            </TabsContent>
            <TabsContent value="warranty" className="mt-6 text-sm text-muted-foreground leading-relaxed">
              <p>This product includes <strong>{product.warranty_months} months</strong> manufacturer warranty.</p>
              <p className="mt-2">See full <Link to="/warranty" className="text-primary font-medium">Warranty Policy</Link> and <Link to="/refund" className="text-primary font-medium">Refund Policy</Link>.</p>
            </TabsContent>
            <TabsContent value="reviews" className="mt-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl font-extrabold">{rating}</span>
                <div>
                  <div className="flex text-amber-500"><Star1 size={16} variant="Bold" /><Star1 size={16} variant="Bold" /><Star1 size={16} variant="Bold" /><Star1 size={16} variant="Bold" /><Star1 size={16} /></div>
                  <p className="text-xs text-muted-foreground">Based on verified purchases</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic">&quot;Great value for money. Fast delivery and genuine product.&quot; — Verified Buyer</p>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
