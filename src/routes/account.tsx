import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CustomerAccountShell } from "@/components/customer-account-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ReferralCard } from "@/components/referral-card";
import { Package, ShoppingBag, ChevronRight, MapPin, Trash2 } from "lucide-react";
import { formatINR, STATUS_LABEL, type OrderStatus } from "@/lib/order-utils";

export const Route = createFileRoute("/account")({ component: Account });

interface RecentOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  created_at: string;
}

interface AddressRow {
  id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

const emptyAddr = () => ({
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
});

function Account() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [addrForm, setAddrForm] = useState(emptyAddr());
  const [addrSaving, setAddrSaving] = useState(false);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/auth", search: { redirect: "/account" } });
  }, [ready, user, navigate]);

  const load = async () => {
    if (!user) return;
    const [{ data: profile }, { data: orders }, { data: addrs }] = await Promise.all([
      supabase.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle(),
      supabase.from("orders").select("id,order_number,status,total,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
      supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }),
    ]);
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      if (!addrForm.full_name) {
        setAddrForm((f) => ({ ...f, full_name: profile.full_name ?? "", phone: profile.phone ?? "" }));
      }
    }
    setRecentOrders((orders as RecentOrder[]) ?? []);
    setAddresses((addrs as AddressRow[]) ?? []);
  };

  useEffect(() => {
    load();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  const saveAddress = async () => {
    if (!user) return;
    if (!addrForm.full_name || !addrForm.phone || !addrForm.line1 || !addrForm.city || !addrForm.state || !addrForm.pincode) {
      toast.error("Fill all required address fields");
      return;
    }
    setAddrSaving(true);
    const isFirst = addresses.length === 0;
    const { error } = await supabase.from("addresses").insert({
      user_id: user.id,
      full_name: addrForm.full_name,
      phone: addrForm.phone,
      line1: addrForm.line1,
      line2: addrForm.line2 || null,
      city: addrForm.city,
      state: addrForm.state,
      pincode: addrForm.pincode,
      country: "India",
      is_default: isFirst,
    });
    setAddrSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Address saved");
      setAddrForm({ ...emptyAddr(), full_name: fullName, phone });
      load();
    }
  };

  const removeAddress = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Address removed"); load(); }
  };

  const displayName = fullName.trim() || user?.email?.split("@")[0] || "there";

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <main className="flex-1">
        <CustomerAccountShell title={`Hi, ${displayName} 👋`} subtitle="Your orders, profile and saved addresses">
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            <Link to="/orders" className="flex items-center gap-3 p-4 bg-card border rounded-xl hover:border-primary/40 transition-colors">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">My Orders</p>
                <p className="text-xs text-muted-foreground">Track delivery status</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/" className="flex items-center gap-3 p-4 bg-card border rounded-xl hover:border-primary/40 transition-colors">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShoppingBag className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Shop Gadgets</p>
                <p className="text-xs text-muted-foreground">Browse deals & new arrivals</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>

          {recentOrders.length > 0 && (
            <section className="mb-6 bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold">Recent orders</h2>
                <Link to="/orders" className="text-sm text-primary font-medium">View all</Link>
              </div>
              <div className="space-y-2">
                {recentOrders.map((o) => (
                  <Link key={o.id} to="/orders/$orderId" params={{ orderId: o.id }}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60">
                    <div>
                      <p className="font-semibold text-sm">{o.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("en-IN")} · {STATUS_LABEL[o.status]}
                      </p>
                    </div>
                    <p className="font-bold text-sm">{formatINR(o.total)}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <ReferralCard />

          <section id="profile" className="bg-card border rounded-xl p-5 space-y-4 mb-6 scroll-mt-24">
            <h2 className="font-bold flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Profile details</h2>
            <div>
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled className="mt-1" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Used for shipping" className="mt-1" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" className="mt-1" />
              </div>
            </div>
            <Button onClick={saveProfile} disabled={saving} className="font-bold">
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </section>

          <section className="bg-card border rounded-xl p-5 space-y-4">
            <h2 className="font-bold">Saved addresses</h2>
            {addresses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved address yet. Add one for faster checkout.</p>
            ) : (
              <div className="space-y-2">
                {addresses.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg border bg-muted/30 text-sm flex justify-between gap-2">
                    <div>
                      <p className="font-semibold">{a.full_name} · {a.phone}</p>
                      <p className="text-muted-foreground mt-0.5">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} — {a.pincode}</p>
                      {a.is_default && <span className="text-[10px] font-bold text-primary">DEFAULT</span>}
                    </div>
                    <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => removeAddress(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4 grid sm:grid-cols-2 gap-3">
              <div><Label>Full Name</Label><Input value={addrForm.full_name} onChange={(e) => setAddrForm({ ...addrForm, full_name: e.target.value })} className="mt-1" /></div>
              <div><Label>Phone</Label><Input value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2"><Label>Address Line 1</Label><Input value={addrForm.line1} onChange={(e) => setAddrForm({ ...addrForm, line1: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2"><Label>Address Line 2 (optional)</Label><Input value={addrForm.line2} onChange={(e) => setAddrForm({ ...addrForm, line2: e.target.value })} className="mt-1" /></div>
              <div><Label>City</Label><Input value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} className="mt-1" /></div>
              <div><Label>State</Label><Input value={addrForm.state} onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })} className="mt-1" /></div>
              <div><Label>Pincode</Label><Input value={addrForm.pincode} onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2">
                <Button onClick={saveAddress} disabled={addrSaving} variant="outline" className="font-bold">
                  {addrSaving ? "Saving…" : "+ Add address"}
                </Button>
              </div>
            </div>
          </section>
        </CustomerAccountShell>
      </main>
      <SiteFooter />
    </div>
  );
}
