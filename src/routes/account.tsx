import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Package, ShoppingBag, UserRound, ChevronRight } from "lucide-react";
import { formatINR, STATUS_LABEL, type OrderStatus } from "@/lib/order-utils";

export const Route = createFileRoute("/account")({ component: Account });

interface RecentOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  created_at: string;
}

function Account() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/auth", search: { redirect: "/account" } });
  }, [ready, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name,phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name ?? "");
          setPhone(data.phone ?? "");
        }
      });

    supabase
      .from("orders")
      .select("id,order_number,status,total,created_at")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setRecentOrders((data as RecentOrder[]) ?? []));
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  const displayName = fullName.trim() || user?.email?.split("@")[0] || "there";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-extrabold mb-1">Hi, {displayName}</h1>
        <p className="text-sm text-muted-foreground mb-8">Manage your profile and track orders</p>

        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          <Link
            to="/orders"
            className="flex items-center gap-3 p-4 bg-card border rounded-xl hover:shadow-product transition-shadow"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">My Orders</p>
              <p className="text-xs text-muted-foreground">Track delivery status</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-3 p-4 bg-card border rounded-xl hover:shadow-product transition-shadow"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Continue Shopping</p>
              <p className="text-xs text-muted-foreground">Browse new arrivals</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>

        {recentOrders.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Recent orders</h2>
              <Link to="/orders" className="text-sm text-primary font-medium">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {recentOrders.map((o) => (
                <Link
                  key={o.id}
                  to="/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="flex items-center justify-between gap-3 p-3 bg-card border rounded-lg hover:shadow-product transition-shadow"
                >
                  <div>
                    <p className="font-semibold text-sm">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })} ·{" "}
                      {STATUS_LABEL[o.status]}
                    </p>
                  </div>
                  <p className="font-bold text-sm">{formatINR(o.total)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="bg-card border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <UserRound className="h-4 w-4 text-primary" />
            <h2 className="font-bold">Profile details</h2>
          </div>
          <div>
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div>
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Used for shipping" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" />
          </div>
          <Button onClick={save} disabled={saving} className="font-bold">
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
