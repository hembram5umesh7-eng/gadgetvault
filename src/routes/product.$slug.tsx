import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { fetchProductBySlug } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductSpecsTable } from "@/components/product-specs-table";
import { ProductHtmlContent } from "@/components/product-html-content";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useCompare } from "@/lib/compare-context";
import { formatINR } from "@/lib/order-utils";
import { STORE } from "@/lib/store-info";
import { VARIANT_COLOR_LABEL, VARIANT_SIZE_LABEL } from "@/lib/gadget-labels";
import { productMrp } from "@/lib/product-pricing";
import { useAuth } from "@/lib/auth-context";
import { recordProductView } from "@/lib/user-personalization";
import { fetchFlashSalePrice } from "@/lib/flash-sale-client";
import { ProductReviews, type ProductReviewRow } from "@/components/product-reviews";
import { ProductShareButton } from "@/components/product-share-button";
import { StarRatingSummary } from "@/components/star-rating";
import { ShoppingBag, Flash, ShieldTick, Truck, Heart, Element3 } from "iconsax-react";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$slug")({
  validateSearch: (s: Record<string, unknown>) => ({
    deal: s.deal === true || s.deal === "true" || s.deal === 1 || s.deal === "1",
  }),
  component: ProductPage,
});

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  marketing_price?: number | null;
  specs: string | null;
  brand: string | null;
  warranty_months: number;
  images: string[] | null;
  category: string;
}
interface Variant {
  id: string;
  size: string;
  color: string;
  color_hex: string;
  variant_image?: string | null;
  stock: number;
}

function ProductPage() {
  const { slug } = useParams({ from: "/product/$slug" });
  const { deal: flashDealContext } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const cart = useCart();
  const wishlist = useWishlist();
  const compare = useCompare();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [model, setModel] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [flashPrice, setFlashPrice] = useState<{ active: boolean; salePrice: number | null; displayMrp: number | null }>({
    active: false,
    salePrice: null,
    displayMrp: null,
  });
  const [reviews, setReviews] = useState<ProductReviewRow[]>([]);
  const [reviewAvg, setReviewAvg] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(false);
      setProduct(null);
      setVariants([]);
      try {
        const detail = await fetchProductBySlug(slug);
        if (cancelled) return;
        if (!detail) {
          setLoadError(true);
          return;
        }
        setProduct(detail);
        setVariants(detail.variants);
        if (detail.variants.length) {
          setModel(detail.variants[0].size);
          setColor(detail.variants[0].color);
        }
        const flash = await fetchFlashSalePrice(detail.slug);
        if (!cancelled) setFlashPrice(flash);

        const { data: approved } = await supabase
          .from("product_reviews")
          .select("id, rating, title, body, created_at, user_id")
          .eq("product_slug", slug)
          .eq("approved", true);
        if (cancelled) return;
        const rows = approved ?? [];
        if (rows.length) {
          setReviewCount(rows.length);
          setReviewAvg(rows.reduce((s, r) => s + r.rating, 0) / rows.length);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    (async () => {
      const { data: approved } = await supabase
        .from("product_reviews")
        .select("id, rating, title, body, created_at, user_id")
        .eq("product_slug", product.slug)
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(50);

      let rows = approved ?? [];
      if (user) {
        const { data: mine } = await supabase
          .from("product_reviews")
          .select("id, rating, title, body, created_at, user_id")
          .eq("product_slug", product.slug)
          .eq("user_id", user.id)
          .maybeSingle();
        if (mine && !rows.some((r) => r.id === mine.id)) {
          rows = [mine, ...rows];
        }
      }

      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] };
      const nameMap = new Map((profiles ?? []).map((pr) => [pr.id, pr.full_name]));

      setReviews(
        rows.map((r) => ({
          id: r.id,
          userId: r.user_id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          created_at: r.created_at,
          authorName: user?.id === r.user_id ? "You" : (nameMap.get(r.user_id) || "Customer"),
        })),
      );
    })();
  }, [product?.slug, user?.id]);

  useEffect(() => {
    if (!product) return;
    recordProductView(user?.id ?? null, {
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
    });
  }, [product?.id, product?.slug, product?.name, product?.category, user?.id]);

  const models = useMemo(() => Array.from(new Set(variants.map((v) => v.size))), [variants]);
  const colors = useMemo(() => {
    const seen = new Map<string, Variant>();
    variants.forEach((v) => {
      if (model && v.size !== model) return;
      if (!seen.has(v.color)) seen.set(v.color, v);
    });
    return Array.from(seen.values());
  }, [variants, model]);
  const selectedVariant = useMemo(
    () => variants.find((v) => v.size === model && v.color === color) ?? null,
    [variants, model, color],
  );

  const specExtras = useMemo(() => {
    if (!product) return [];
    const rows = [
      product.brand ? { key: "Brand", value: product.brand } : null,
      { key: "Category", value: product.category.replace(/-/g, " ") },
      model ? { key: VARIANT_SIZE_LABEL, value: model } : null,
      color ? { key: VARIANT_COLOR_LABEL, value: color } : null,
      selectedVariant ? { key: "Stock", value: String(selectedVariant.stock) } : null,
    ];
    return rows.filter(Boolean) as { key: string; value: string }[];
  }, [product, model, color, selectedVariant]);

  const displayImages = useMemo(() => {
    const base = product?.images ?? [];
    const variantImg = selectedVariant?.variant_image;
    if (variantImg) return [variantImg, ...base.filter((u) => u !== variantImg)];
    return base;
  }, [product?.images, selectedVariant?.variant_image]);

  useEffect(() => {
    setImgIdx(0);
  }, [selectedVariant?.id]);

  useEffect(() => {
    if (!model || !variants.length) return;
    const forModel = variants.filter((v) => v.size === model);
    if (!forModel.length) return;
    if (color && forModel.some((v) => v.color === color)) return;
    setColor(forModel[0].color);
  }, [model, variants, color]);

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader /><div className="flex-1 container mx-auto px-4 py-12">Loading…</div><SiteFooter />
    </div>
  );

  if (loadError || !product) return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <div className="flex-1 container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <p className="text-muted-foreground mt-2">This item may have been removed or is temporarily unavailable.</p>
        <Button asChild className="mt-6"><Link to="/">Back to Home</Link></Button>
      </div>
      <SiteFooter />
    </div>
  );

  const isFlashCheckout = flashDealContext && flashPrice.active && flashPrice.salePrice != null;
  const salePrice = isFlashCheckout ? flashPrice.salePrice! : product.base_price;
  const showMrp = isFlashCheckout && flashPrice.displayMrp != null
    ? flashPrice.displayMrp
    : productMrp(product.base_price, product.marketing_price);
  const mrp = showMrp;
  const discount = mrp > salePrice ? Math.round((1 - salePrice / mrp) * 100) : 0;

  const addToCart = (buyNow = false) => {
    if (!model || !color) { toast.error(`Pick ${VARIANT_SIZE_LABEL.toLowerCase()} and color`); return; }
    if (selectedVariant && selectedVariant.stock <= 0) { toast.error("Out of stock"); return; }
    cart.add({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      productImage: selectedVariant?.variant_image || product.images?.[0] || "",
      size: model, color,
      colorHex: selectedVariant?.color_hex ?? "#000",
      variantId: selectedVariant?.id ?? null,
      basePrice: salePrice,
      priceSource: isFlashCheckout ? "flash" : "regular",
      quantity: 1,
    });
    toast.success(buyNow ? "Added — opening cart" : "Added to cart ✓");
    if (buyNow) navigate({ to: "/cart" });
  };

  const toggleWishlist = () => {
    const wasIn = wishlist.has(product.id);
    wishlist.toggle({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images?.[0] ?? "",
      price: salePrice,
    });
    toast.message(wasIn ? "Removed from wishlist" : "Added to wishlist");
  };

  const addCompare = () => {
    const ok = compare.add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images?.[0] ?? "",
      price: salePrice,
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
              {displayImages[imgIdx] && (
                <img src={displayImages[imgIdx]} alt={product.name} className="w-full h-full object-contain drop-shadow-lg" />
              )}
            </div>
            {displayImages.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide">
                {displayImages.map((src, i) => (
                  <button key={src + i} type="button" onClick={() => setImgIdx(i)}
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
            {reviewCount > 0 && (
              <div className="mt-2">
                <StarRatingSummary avg={reviewAvg} count={reviewCount} size="md" />
              </div>
            )}

            {product.warranty_months > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                {product.warranty_months} month warranty as listed · See warranty tab for details
              </p>
            )}

            <div className="mt-4 flex items-baseline gap-3 flex-wrap">
              {isFlashCheckout && (
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg flex items-center gap-1">
                  <Flash size={12} variant="Bold" /> Flash Sale Price
                </span>
              )}
              <span className="text-3xl font-extrabold">{formatINR(salePrice)}</span>
              {discount > 0 && (
                <>
                  <span className="text-lg text-muted-foreground line-through">{formatINR(mrp)}</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg flex items-center gap-1">
                    <Flash size={12} variant="Bold" /> {discount}% OFF
                  </span>
                </>
              )}
            </div>
            {!isFlashCheckout && flashPrice.active && flashPrice.salePrice != null && flashPrice.salePrice !== product.base_price && (
              <p className="text-xs text-muted-foreground mt-2">
                Flash sale price {formatINR(flashPrice.salePrice)} available via{" "}
                <Link
                  to="/product/$slug"
                  params={{ slug: product.slug }}
                  search={{ deal: true }}
                  className="text-primary font-semibold hover:underline"
                >
                  Flash Sale
                </Link>{" "}
                or{" "}
                <Link to="/deals" className="text-primary font-semibold hover:underline">
                  Deals page
                </Link>
                .
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Price inclusive of applicable taxes</p>

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
              <div className="flex flex-wrap gap-3">
                {colors.map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setColor(c.color)}
                    title={c.color}
                    className={`flex flex-col items-center gap-1.5 transition-all ${color === c.color ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
                  >
                    <span
                      className={`w-12 h-12 rounded-full border-2 overflow-hidden flex items-center justify-center ${color === c.color ? "border-primary scale-105 ring-2 ring-primary/20" : "border-border"}`}
                      style={c.variant_image ? undefined : { backgroundColor: c.color_hex }}
                    >
                      {c.variant_image ? (
                        <img src={c.variant_image} alt={c.color} className="w-full h-full object-cover" />
                      ) : null}
                    </span>
                    <span className={`text-[10px] font-semibold max-w-[4.5rem] truncate ${color === c.color ? "text-primary" : "text-muted-foreground"}`}>
                      {c.color}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {selectedVariant && (
              <p className={`text-sm mt-3 font-semibold ${selectedVariant.stock > 0 ? "text-success" : "text-destructive"}`}>
                {selectedVariant.stock > 0 ? `${selectedVariant.stock} in stock` : "Out of stock"}
              </p>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="flex-1 font-bold rounded-xl h-12 shadow-sm" onClick={() => addToCart(false)}>
                <ShoppingBag size={22} variant="Bold" className="mr-2" /> Add to Cart
              </Button>
              <Button size="lg" variant="secondary" className="flex-1 font-bold rounded-xl h-12" onClick={() => addToCart(true)}>Buy Now →</Button>
            </div>

            <div className="flex gap-2 mt-3 flex-wrap">
              <Button variant="outline" size="sm" className="rounded-xl flex-1 min-w-[120px]" onClick={toggleWishlist}>
                <Heart size={16} className={`mr-1.5 ${wishlist.has(product.id) ? "fill-primary text-primary" : ""}`} variant={wishlist.has(product.id) ? "Bold" : "Linear"} />
                Wishlist
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl flex-1 min-w-[120px]" onClick={addCompare}>
                <Element3 size={16} className="mr-1.5" /> Compare
              </Button>
              <ProductShareButton
                productName={product.name}
                productSlug={product.slug}
                imageUrl={displayImages[0]}
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
              {product.warranty_months > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
                  <ShieldTick size={18} className="text-success shrink-0" variant="Bold" />
                  <span>{product.warranty_months} months warranty</span>
                </div>
              )}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
                <Truck size={18} className="text-primary shrink-0" variant="Bold" />
                <span>Free shipping on orders ₹{STORE.freeShippingMin}+</span>
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
            <TabsContent value="overview" className="mt-6">
              <ProductHtmlContent html={product.description} />
            </TabsContent>
            <TabsContent value="specs" className="mt-6">
              <ProductSpecsTable specs={product.specs} extraRows={specExtras} />
            </TabsContent>
            <TabsContent value="warranty" className="mt-6 text-sm text-muted-foreground leading-relaxed">
              {product.warranty_months > 0 ? (
                <>
                  <p>This listing includes <strong>{product.warranty_months} months</strong> warranty where applicable.</p>
                  <p className="mt-2">See our <Link to="/warranty" className="text-primary font-medium">Warranty Policy</Link> and <Link to="/refund" className="text-primary font-medium">Refund Policy</Link> for full terms.</p>
                </>
              ) : (
                <p>Warranty details for this product are not listed. Contact {STORE.email} before purchase if you need warranty information.</p>
              )}
            </TabsContent>
            <TabsContent value="reviews" className="mt-6">
              <ProductReviews
                productId={product.id}
                productSlug={product.slug}
                productName={product.name}
                userId={user?.id}
                initialReviews={reviews}
                initialAvg={reviewAvg}
                initialCount={reviewCount}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
