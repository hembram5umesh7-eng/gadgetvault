import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/order-utils";
import { Type, Image as ImageIcon, Trash2, RotateCw, ShoppingBag, Layers } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/customize")({
  validateSearch: (s: Record<string, unknown>) => ({ product: (s.product as string) ?? "" }),
  component: CustomizePage,
});

interface ProductLite {
  id: string; name: string; slug: string; base_price: number; images: string[] | null;
  text_price: number; image_price: number; allow_text: boolean; allow_image: boolean;
}
interface VariantLite { id: string; size: string; color: string; color_hex: string }

const SHIRT_COLORS = [
  { name: "White", hex: "#FFFFFF" },
  { name: "Black", hex: "#111111" },
  { name: "Navy", hex: "#1B2A4E" },
  { name: "Maroon", hex: "#800000" },
  { name: "Olive", hex: "#5A6B3B" },
  { name: "Mustard", hex: "#D4A017" },
];

const TEXT_COLORS = ["#000000", "#FFFFFF", "#E11D48", "#2563EB", "#16A34A", "#F59E0B", "#9333EA"];
const FONTS = ["Plus Jakarta Sans", "Impact", "Georgia", "Courier New", "Arial Black"];

function CustomizePage() {
  const { product: slug } = Route.useSearch();
  const navigate = useNavigate();
  const cart = useCart();
  const { user } = useAuth();
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<any>(null);
  const sidesRef = useRef<{ front: any; back: any }>({ front: null, back: null });

  const [side, setSide] = useState<"front" | "back">("front");
  const [shirtColor, setShirtColor] = useState(SHIRT_COLORS[0].hex);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [product, setProduct] = useState<ProductLite | null>(null);
  const [variants, setVariants] = useState<VariantLite[]>([]);
  const [size, setSize] = useState<string | null>(null);

  const [textInput, setTextInput] = useState("Your Name");
  const [textColor, setTextColor] = useState("#000000");
  const [textFont, setTextFont] = useState(FONTS[0]);
  const [textSize, setTextSize] = useState([42]);

  const [hasText, setHasText] = useState(false);
  const [hasImage, setHasImage] = useState(false);

  useEffect(() => {
    supabase
      .from("products")
      .select("id,name,slug,base_price,images,text_price,image_price,allow_text,allow_image")
      .eq("active", true).eq("customizable", true)
      .then(({ data }) => {
        const list = (data as ProductLite[]) ?? [];
        setProducts(list);
        const initial = list.find((p) => p.slug === slug) ?? list[0] ?? null;
        setProduct(initial);
      });
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    supabase.from("product_variants").select("*").eq("product_id", product.id).then(({ data }) => {
      setVariants((data as VariantLite[]) ?? []);
      const sizes = Array.from(new Set((data ?? []).map((v: any) => v.size)));
      setSize(sizes[0] ?? null);
    });
  }, [product]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!canvasElRef.current || fabricRef.current) return;
      const fabric = await import("fabric");
      if (cancelled) return;
      const c = new fabric.Canvas(canvasElRef.current, {
        width: 320,
        height: 380,
        backgroundColor: "transparent",
        preserveObjectStacking: true,
      });
      fabricRef.current = c;
      sidesRef.current.front = c.toJSON();
      sidesRef.current.back = c.toJSON();
      c.on("object:added", recalc);
      c.on("object:removed", recalc);
    })();
    return () => { cancelled = true; };
  }, []);

  const recalc = () => {
    const c = fabricRef.current; if (!c) return;
    let t = false, im = false;
    c.getObjects().forEach((o: any) => {
      if (o.type === "i-text" || o.type === "text" || o.type === "textbox") t = true;
      if (o.type === "image") im = true;
    });
    setHasText(t); setHasImage(im);
  };

  const switchSide = async (next: "front" | "back") => {
    const c = fabricRef.current; if (!c || side === next) return;
    sidesRef.current[side] = c.toJSON();
    c.clear();
    c.backgroundColor = "transparent";
    if (sidesRef.current[next]) {
      await new Promise<void>((res) => c.loadFromJSON(sidesRef.current[next], () => { c.renderAll(); res(); }));
    }
    setSide(next);
    setTimeout(recalc, 0);
  };

  const addText = async () => {
    const c = fabricRef.current; if (!c) return;
    const fabric = await import("fabric");
    const t = new fabric.IText(textInput || "Text", {
      left: 100, top: 150,
      fontFamily: textFont,
      fontWeight: "bold",
      fill: textColor,
      fontSize: textSize[0],
    });
    c.add(t).setActiveObject(t);
    c.renderAll();
  };

  const addImage = async (file: File) => {
    const c = fabricRef.current; if (!c) return;
    const fabric = await import("fabric");
    const url = URL.createObjectURL(file);
    fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" }).then((img: any) => {
      const max = 160;
      const scale = Math.min(max / img.width!, max / img.height!, 1);
      img.scale(scale);
      img.set({ left: 80, top: 100 });
      c.add(img).setActiveObject(img);
      c.renderAll();
    });
  };

  const deleteSelected = () => {
    const c = fabricRef.current; if (!c) return;
    const obj = c.getActiveObject();
    if (obj) { c.remove(obj); c.discardActiveObject().renderAll(); }
  };

  const rotateSelected = () => {
    const c = fabricRef.current; if (!c) return;
    const obj = c.getActiveObject();
    if (obj) { obj.rotate(((obj.angle ?? 0) + 15) % 360); c.renderAll(); }
  };

  const clearAll = () => {
    const c = fabricRef.current; if (!c) return;
    c.clear(); c.backgroundColor = "transparent"; c.renderAll();
  };

  const customizationPrice = (() => {
    if (!product) return 0;
    let p = 0;
    if (hasText && product.allow_text) p += product.text_price;
    if (hasImage && product.allow_image) p += product.image_price;
    return p;
  })();
  const total = (product?.base_price ?? 0) + customizationPrice;

  const uploadPreview = async (dataUrl: string, key: string): Promise<string | null> => {
    if (!user) return null;
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${user.id}/${Date.now()}-${key}.png`;
    const { error } = await supabase.storage.from("custom-designs").upload(path, blob, {
      contentType: "image/png", upsert: false,
    });
    if (error) return null;
    const { data } = supabase.storage.from("custom-designs").getPublicUrl(path);
    return data.publicUrl;
  };

  const addToCart = async () => {
    if (!product || !size) { toast.error("Pick a product and size"); return; }
    const c = fabricRef.current;
    if (c) sidesRef.current[side] = c.toJSON();
    let frontUrl: string | undefined, backUrl: string | undefined;

    if (c && user) {
      const cur = side;
      c.clear(); c.backgroundColor = "transparent";
      await new Promise<void>((res) => c.loadFromJSON(sidesRef.current.front, () => { c.renderAll(); res(); }));
      frontUrl = (await uploadPreview(c.toDataURL({ format: "png", multiplier: 1 }), "front")) ?? undefined;
      c.clear(); c.backgroundColor = "transparent";
      await new Promise<void>((res) => c.loadFromJSON(sidesRef.current.back, () => { c.renderAll(); res(); }));
      backUrl = (await uploadPreview(c.toDataURL({ format: "png", multiplier: 1 }), "back")) ?? undefined;
      c.clear(); c.backgroundColor = "transparent";
      await new Promise<void>((res) => c.loadFromJSON(sidesRef.current[cur], () => { c.renderAll(); res(); }));
    }

    cart.add({
      id: crypto.randomUUID(),
      productId: product.id,
      productName: product.name,
      productImage: product.images?.[0] ?? "",
      size,
      color: SHIRT_COLORS.find((c2) => c2.hex === shirtColor)?.name ?? "Custom",
      colorHex: shirtColor,
      variantId: variants.find((v) => v.size === size)?.id ?? null,
      basePrice: product.base_price,
      customizationPrice,
      quantity: 1,
      designData: { front: sidesRef.current.front, back: sidesRef.current.back, shirtColor },
      previewFront: frontUrl,
      previewBack: backUrl,
    });
    toast.success("Custom design added to cart");
    navigate({ to: "/cart" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-6">
        <h1 className="text-3xl font-extrabold mb-1">Design Studio</h1>
        <p className="text-muted-foreground mb-6">Add text, upload your logo, drag, resize, rotate. Live preview on the garment.</p>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="bg-gradient-to-br from-secondary to-muted rounded-3xl p-4 md:p-8 flex flex-col items-center">
            <div className="flex gap-2 mb-4">
              <Button size="sm" variant={side === "front" ? "default" : "outline"} onClick={() => switchSide("front")}>Front</Button>
              <Button size="sm" variant={side === "back" ? "default" : "outline"} onClick={() => switchSide("back")}>Back</Button>
            </div>

            <div className="relative" style={{ width: 360, maxWidth: "100%" }}>
              <svg viewBox="0 0 360 440" className="w-full h-auto drop-shadow-elegant">
                <path
                  d="M70 50 L130 20 Q180 50 230 20 L290 50 L340 100 L300 140 L300 420 Q180 440 60 420 L60 140 L20 100 Z"
                  fill={shirtColor}
                  stroke="#0001"
                  strokeWidth="1"
                />
                <path d="M130 20 Q180 60 230 20" fill="none" stroke="#0002" strokeWidth="1.5" />
              </svg>
              <div className="absolute" style={{ top: 50, left: 20, right: 20, bottom: 20, display: "flex", justifyContent: "center" }}>
                <canvas ref={canvasElRef} className="rounded" />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={rotateSelected}><RotateCw className="h-4 w-4 mr-1" />Rotate</Button>
              <Button size="sm" variant="outline" onClick={deleteSelected}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
              <Button size="sm" variant="ghost" onClick={clearAll}><Layers className="h-4 w-4 mr-1" />Clear</Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card border rounded-xl p-4">
              <Label className="text-xs uppercase font-bold">Product</Label>
              <select
                value={product?.id ?? ""}
                onChange={(e) => setProduct(products.find((p) => p.id === e.target.value) ?? null)}
                className="mt-2 w-full h-10 px-3 rounded-md border bg-background text-sm"
              >
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <Label className="text-xs uppercase font-bold mt-4 block">Garment Color</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SHIRT_COLORS.map((c) => (
                  <button key={c.hex} onClick={() => setShirtColor(c.hex)} title={c.name}
                    className={`w-9 h-9 rounded-full border-2 ${shirtColor === c.hex ? "border-primary scale-110" : "border-border"}`}
                    style={{ backgroundColor: c.hex }} />
                ))}
              </div>

              <Label className="text-xs uppercase font-bold mt-4 block">Size</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from(new Set(variants.map((v) => v.size))).map((s) => (
                  <button key={s} onClick={() => setSize(s)}
                    className={`min-w-10 h-10 px-3 rounded-full border-2 text-sm font-bold ${size === s ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card border rounded-xl p-4">
              <Tabs defaultValue="text">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="text" disabled={!product?.allow_text}><Type className="h-4 w-4 mr-1" />Text</TabsTrigger>
                  <TabsTrigger value="image" disabled={!product?.allow_image}><ImageIcon className="h-4 w-4 mr-1" />Logo</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="space-y-3 pt-3">
                  <Input value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Type your text" />
                  <div>
                    <Label className="text-xs">Font</Label>
                    <select value={textFont} onChange={(e) => setTextFont(e.target.value)}
                      className="mt-1 w-full h-9 px-2 rounded-md border bg-background text-sm">
                      {FONTS.map((f) => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Size: {textSize[0]}px</Label>
                    <Slider value={textSize} onValueChange={setTextSize} min={16} max={96} step={2} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Color</Label>
                    <div className="mt-1 flex gap-2">
                      {TEXT_COLORS.map((c) => (
                        <button key={c} onClick={() => setTextColor(c)}
                          className={`w-7 h-7 rounded-full border-2 ${textColor === c ? "border-primary scale-110" : "border-border"}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <Button size="sm" className="w-full" onClick={addText}><Type className="h-4 w-4 mr-1" />Add Text to Design</Button>
                </TabsContent>
                <TabsContent value="image" className="pt-3">
                  <Label className="text-xs">Upload PNG / JPG (max 5MB)</Label>
                  <Input type="file" accept="image/*" className="mt-1" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
                    addImage(f);
                    e.target.value = "";
                  }} />
                  <p className="text-xs text-muted-foreground mt-2">Tip: Use transparent PNGs for best results.</p>
                </TabsContent>
              </Tabs>
            </div>

            <div className="bg-card border rounded-xl p-4 space-y-1">
              <div className="flex justify-between text-sm"><span>Base price</span><span>{formatINR(product?.base_price ?? 0)}</span></div>
              <div className="flex justify-between text-sm"><span>Customization</span><span className="text-primary font-semibold">+ {formatINR(customizationPrice)}</span></div>
              <div className="border-t pt-2 mt-2 flex justify-between font-extrabold text-lg">
                <span>Total</span><span>{formatINR(total)}</span>
              </div>
              <Button size="lg" className="w-full mt-3 font-bold" onClick={addToCart}>
                <ShoppingBag className="h-5 w-5 mr-2" /> Add Custom Design to Cart
              </Button>
              {!user && (
                <p className="text-[11px] text-muted-foreground text-center mt-1">
                  Sign in before checkout to save your design preview permanently.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
