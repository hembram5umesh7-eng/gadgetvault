import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { createCoupon, deleteCoupon, listCoupons, toggleCoupon } from "@/lib/coupon.functions";
import { formatINR } from "@/lib/order-utils";
import { toast } from "sonner";
import { Plus, Tag, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/coupons")({ component: AdminCoupons });

interface CouponRow {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  applies_to: string;
  usage_limit: number | null;
  used_count: number;
  active: boolean;
  expires_at: string | null;
}

interface ProductOpt { id: string; name: string }

function AdminCoupons() {
  const listFn = useAuthedServerFn(listCoupons);
  const createFn = useAuthedServerFn(createCoupon);
  const deleteFn = useAuthedServerFn(deleteCoupon);
  const toggleFn = useAuthedServerFn(toggleCoupon);

  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    description: "",
    discountType: "percent" as "percent" | "fixed",
    discountValue: 10,
    minOrderAmount: 0,
    appliesTo: "all" as "all" | "selected",
    productIds: [] as string[],
    usageLimit: "",
  });

  const load = async () => {
    const res = await listFn();
    setCoupons(res.coupons as CouponRow[]);
  };

  useEffect(() => {
    load();
    supabase.from("products").select("id,name").eq("active", true).order("name").then(({ data }) => {
      setProducts((data as ProductOpt[]) ?? []);
    });
  }, []);

  const submit = async () => {
    if (!form.code.trim()) return toast.error("Enter coupon code");
    try {
      await createFn({
        data: {
          code: form.code,
          description: form.description || undefined,
          discountType: form.discountType,
          discountValue: form.discountValue,
          minOrderAmount: form.minOrderAmount,
          appliesTo: form.appliesTo,
          productIds: form.appliesTo === "selected" ? form.productIds : undefined,
          usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        },
      });
      toast.success("Coupon created");
      setShowForm(false);
      setForm({ code: "", description: "", discountType: "percent", discountValue: 10, minOrderAmount: 0, appliesTo: "all", productIds: [], usageLimit: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <AdminShell title="Coupons & Offers" subtitle="Create store-wide or product-specific discount codes">
      <div className="mb-6">
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2 font-bold">
          <Plus className="h-4 w-4" /> New Coupon
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border rounded-xl p-5 mb-6 space-y-4 max-w-2xl">
          <h2 className="font-bold flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /> Create coupon</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE10" className="mt-1" /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Festive sale" className="mt-1" /></div>
            <div>
              <Label>Discount type</Label>
              <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as "percent" | "fixed" })} className="w-full h-10 px-3 rounded-md border bg-background mt-1 text-sm">
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed (₹)</option>
              </select>
            </div>
            <div><Label>Value</Label><Input type="number" min={1} value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} className="mt-1" /></div>
            <div><Label>Min order (₹)</Label><Input type="number" min={0} value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })} className="mt-1" /></div>
            <div><Label>Usage limit (optional)</Label><Input value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="100" className="mt-1" /></div>
          </div>
          <div>
            <Label>Applies to</Label>
            <select value={form.appliesTo} onChange={(e) => setForm({ ...form, appliesTo: e.target.value as "all" | "selected" })} className="w-full h-10 px-3 rounded-md border bg-background mt-1 text-sm">
              <option value="all">All products</option>
              <option value="selected">Selected products only</option>
            </select>
          </div>
          {form.appliesTo === "selected" && (
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm p-1 hover:bg-muted rounded">
                  <input type="checkbox" checked={form.productIds.includes(p.id)} onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      productIds: e.target.checked ? [...f.productIds, p.id] : f.productIds.filter((id) => id !== p.id),
                    }));
                  }} />
                  {p.name}
                </label>
              ))}
            </div>
          )}
          <Button onClick={submit} className="font-bold">Save coupon</Button>
        </div>
      )}

      <div className="space-y-3">
        {coupons.length === 0 ? (
          <p className="text-muted-foreground p-6 bg-card border rounded-xl text-center">No coupons yet. Create your first offer above.</p>
        ) : coupons.map((c) => (
          <div key={c.id} className="bg-card border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-extrabold text-lg">{c.code}</p>
              <p className="text-sm text-muted-foreground">
                {c.discount_type === "percent" ? `${c.discount_value}% off` : `${formatINR(c.discount_value)} off`}
                {c.min_order_amount > 0 && ` · Min ${formatINR(c.min_order_amount)}`}
                · {c.applies_to === "all" ? "All products" : "Selected products"}
              </p>
              {c.description && <p className="text-xs mt-1">{c.description}</p>}
              <p className="text-xs text-muted-foreground mt-1">Used {c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">Active</span>
                <Switch checked={c.active} onCheckedChange={async (v) => { await toggleFn({ data: { id: c.id, active: v } }); load(); }} />
              </div>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={async () => {
                if (!confirm("Delete coupon?")) return;
                await deleteFn({ data: { id: c.id } });
                toast.success("Deleted");
                load();
              }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
