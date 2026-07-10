import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatINR } from "@/lib/order-utils";
import { slugifyProduct } from "@/lib/product-utils";
import { deleteAdminProduct } from "@/lib/admin.functions";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

interface CategoryOption {
  slug: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  base_price: number;
  marketing_price?: number | null;
  brand: string | null;
  images: string[];
  active: boolean;
  fulfillment_source?: string;
  cj_cost_usd?: number | null;
}

interface Variant {
  product_id: string;
  stock: number;
}

function emptyProduct(defaultCategory = "unique-gadgets") {
  return {
    name: "",
    slug: "",
    description: "",
    category: defaultCategory,
    base_price: 999,
    marketing_price: 1499,
    brand: "",
    images: [] as string[],
    active: true,
    stock: 10,
  };
}

function AdminProducts() {
  const deleteProduct = useAuthedServerFn(deleteAdminProduct);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [stockByProduct, setStockByProduct] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id?: string; data: ReturnType<typeof emptyProduct> } | null>(null);

  const loadCategories = async () => {
    const { data, error } = await supabase.from("categories").select("slug,name").eq("active", true).order("sort_order");
    if (error) { toast.error(error.message); return; }
    setCategories((data as CategoryOption[]) ?? []);
  };

  const refresh = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,slug,description,category,base_price,marketing_price,brand,images,active,fulfillment_source,cj_cost_usd")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    const list = (data ?? []) as Product[];
    setProducts(list);

    if (list.length) {
      const { data: vs } = await supabase
        .from("product_variants")
        .select("product_id,stock")
        .in("product_id", list.map((p) => p.id));
      const stocks: Record<string, number> = {};
      ((vs ?? []) as Variant[]).forEach((v) => {
        stocks[v.product_id] = (stocks[v.product_id] ?? 0) + v.stock;
      });
      setStockByProduct(stocks);
    } else {
      setStockByProduct({});
    }
  };

  useEffect(() => {
    loadCategories();
    refresh();
  }, []);

  const categoryLabel = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = categoryFilter === "all" || p.category === categoryFilter;
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q) || p.category.includes(q);
      return matchCat && matchQ;
    });
  }, [products, filter, categoryFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const cat of categories) map.set(cat.slug, []);
    map.set("_other", []);

    filtered.forEach((p) => {
      const bucket = map.get(p.category) ?? map.get("_other")!;
      bucket.push(p);
    });

    const sections: { slug: string; name: string; items: Product[] }[] = [];
    categories.forEach((c) => {
      const items = map.get(c.slug) ?? [];
      if (categoryFilter === "all" ? items.length > 0 : categoryFilter === c.slug) {
        sections.push({ slug: c.slug, name: c.name, items });
      }
    });
    const other = map.get("_other") ?? [];
    if (other.length) sections.push({ slug: "_other", name: "Other", items: other });
    return sections;
  }, [filtered, categories, categoryFilter]);

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    products.forEach((p) => { counts[p.category] = (counts[p.category] ?? 0) + 1; });
    return counts;
  }, [products]);

  const startNew = () => setEditing({ data: emptyProduct(categories[0]?.slug ?? "unique-gadgets") });
  const startEdit = (p: Product) =>
    setEditing({
      id: p.id,
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description ?? "",
        category: p.category,
        base_price: p.base_price,
        marketing_price: p.marketing_price ?? Math.ceil(p.base_price * 1.45),
        brand: p.brand ?? "",
        images: p.images ?? [],
        active: p.active,
        stock: stockByProduct[p.id] ?? 0,
      },
    });

  const save = async () => {
    if (!editing) return;
    const d = editing.data;
    if (!d.name.trim()) { toast.error("Product name required"); return; }
    if (Number(d.base_price) <= 0) { toast.error("Price must be greater than 0"); return; }

    const slug = d.slug.trim() || slugifyProduct(d.name);
    const payload = {
      name: d.name.trim(),
      slug,
      description: d.description.trim() || null,
      category: d.category,
      base_price: d.base_price,
      marketing_price: Number(d.marketing_price) > 0 ? Number(d.marketing_price) : Math.ceil(d.base_price * 1.45),
      brand: d.brand.trim() || null,
      images: d.images.filter(Boolean),
      active: d.active,
      specs: null,
      warranty_months: 12,
      is_bestseller: false,
      is_deal: false,
    };

    if (editing.id) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Product updated");
    } else {
      const { data: created, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error || !created) { toast.error(error?.message ?? "Create failed"); return; }
      await supabase.from("product_variants").insert({
        product_id: created.id,
        size: "Standard",
        color: "Black",
        color_hex: "#111111",
        stock: d.stock || 10,
      });
      toast.success("Product added");
    }
    setEditing(null);
    refresh();
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?\n\nPast orders will keep the product name in order history.`)) return;
    setDeletingId(p.id);
    try {
      const res = await deleteProduct({ data: { productId: p.id } });
      toast.success(res.message);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (p: Product) => {
    const { error } = await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
    if (error) toast.error(error.message);
    else refresh();
  };

  return (
    <AdminShell
      title="Products"
      subtitle="Category-wise list · CJ Import se products add karo ya manually ek-ek add karo"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild className="font-bold">
            <Link to="/admin/cj-sync">CJ Import</Link>
          </Button>
          <Button onClick={startNew} className="font-bold">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      }
    >
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Total Products</p>
          <p className="text-2xl font-extrabold">{products.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Live</p>
          <p className="text-2xl font-extrabold text-success">{products.filter((p) => p.active).length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Categories</p>
          <p className="text-2xl font-extrabold">{categories.length}</p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-bold border transition-colors",
            categoryFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted",
          )}
        >
          All ({countByCategory.all ?? 0})
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setCategoryFilter(c.slug)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold border transition-colors",
              categoryFilter === c.slug ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted",
            )}
          >
            {c.name} ({countByCategory[c.slug] ?? 0})
          </button>
        ))}
      </div>

      <Input
        placeholder="Search product name or brand…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-md mb-6"
      />

      {/* Grouped product cards */}
      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-bold text-lg">No products yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            CJ Import se products add karo, ya manually ek product add karo.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild><Link to="/admin/cj-sync">CJ Import</Link></Button>
            <Button variant="outline" onClick={startNew}><Plus className="h-4 w-4" /> Add Product</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((section) => (
            <section key={section.slug}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-extrabold">{section.name}</h2>
                <span className="text-xs font-bold text-muted-foreground">{section.items.length} items</span>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {section.items.map((p) => (
                  <article key={p.id} className="rounded-xl border bg-card overflow-hidden hover:border-primary/40 transition-colors">
                    <div className="flex gap-3 p-3">
                      <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.brand || "No brand"}</p>
                        {p.fulfillment_source === "cj" && (
                          <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-700">CJ Dropship</span>
                        )}
                        <p className="text-sm font-extrabold text-primary mt-1">{formatINR(Number(p.base_price))}</p>
                        {p.marketing_price && p.marketing_price > p.base_price && (
                          <p className="text-xs text-muted-foreground line-through">{formatINR(Number(p.marketing_price))}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Stock: {stockByProduct[p.id] ?? 0} · {categoryLabel(p.category)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t px-3 py-2 bg-muted/20">
                      <button
                        type="button"
                        onClick={() => toggleActive(p)}
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          p.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {p.active ? "● LIVE" : "○ HIDDEN"}
                      </button>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(p)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(p)}
                          disabled={deletingId === p.id}
                          title="Delete"
                          className="text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit Product" : "Add Product (Simple)"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Product Name *</Label>
                <Input
                  value={editing.data.name}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, name: e.target.value } })}
                  placeholder="Pro TWS Earbuds X3"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Selling Price (₹) *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editing.data.base_price}
                    onChange={(e) => setEditing({ ...editing, data: { ...editing.data, base_price: Number(e.target.value) } })}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Customer pays this price</p>
                </div>
                <div>
                  <Label>Marketing / MRP (₹)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editing.data.marketing_price}
                    onChange={(e) => setEditing({ ...editing, data: { ...editing.data, marketing_price: Number(e.target.value) } })}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Shown struck-through on product page</p>
                </div>
              </div>
              <div>
                <Label>Category *</Label>
                <select
                  value={editing.data.category}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, category: e.target.value } })}
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm mt-1"
                >
                  {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Brand</Label>
                  <Input
                    value={editing.data.brand}
                    onChange={(e) => setEditing({ ...editing, data: { ...editing.data, brand: e.target.value } })}
                    placeholder="Brand name"
                  />
                </div>
                {!editing.id && (
                  <div>
                    <Label>Stock</Label>
                    <Input
                      type="number"
                      min={0}
                      value={editing.data.stock}
                      onChange={(e) => setEditing({ ...editing, data: { ...editing.data, stock: Number(e.target.value) } })}
                    />
                  </div>
                )}
              </div>
              <div>
                <Label>Image URL</Label>
                <Input
                  value={editing.data.images[0] ?? ""}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, images: e.target.value ? [e.target.value] : [] } })}
                  placeholder="https://…"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editing.data.description}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, description: e.target.value } })}
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3">
                <p className="text-sm font-semibold">Show on store (Live)</p>
                <Switch
                  checked={editing.data.active}
                  onCheckedChange={(c) => setEditing({ ...editing, data: { ...editing.data, active: c } })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} className="font-bold">{editing.id ? "Save" : "Add Product"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminShell>
  );
}
