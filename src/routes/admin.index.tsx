import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { formatINR, STATUS_LABEL, type OrderStatus } from "@/lib/order-utils";
import { useAuth } from "@/lib/auth-context";
import { getAdminAnalytics } from "@/lib/analytics.functions";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Package, ShoppingCart, TrendingUp, Truck, Upload, Users, Eye, IndianRupee } from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

type Analytics = Awaited<ReturnType<typeof getAdminAnalytics>>;

function formatDay(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function AdminDashboard() {
  const { isAdmin } = useAuth();
  const loadAnalytics = useAuthedServerFn(getAdminAnalytics);
  const [orders, setOrders] = useState<{ id: string; order_number: string; status: OrderStatus; total: number; created_at: string }[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: o }, stats] = await Promise.all([
          supabase.from("orders").select("id,order_number,status,total,created_at").order("created_at", { ascending: false }).limit(10),
          loadAnalytics(),
        ]);
        setOrders((o ?? []) as typeof orders);
        setAnalytics(stats);
      } catch {
        /* partial load ok */
      } finally {
        setLoading(false);
      }
    })();
  }, [loadAnalytics]);

  const chartData = (analytics?.last7Days ?? []).map((d) => ({
    ...d,
    label: formatDay(d.date),
  }));

  const today = analytics?.today;
  const totals = analytics?.totals;

  return (
    <AdminShell title="Dashboard" subtitle="Store performance — visitors, orders, and revenue at a glance.">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Visitors today", value: today?.visitors ?? "—", icon: Eye, hint: "Unique browsers today" },
          { label: "Orders today", value: today?.orders ?? "—", icon: ShoppingCart, hint: "Placed today" },
          { label: "Revenue today", value: today ? formatINR(today.revenue) : "—", icon: IndianRupee, hint: "Excl. cancelled" },
          { label: "Sign-ups today", value: today?.signups ?? "—", icon: Users, hint: "New customer accounts" },
        ].map((s) => (
          <div key={s.label} className="bg-card border rounded-xl p-5">
            <s.icon className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs uppercase font-bold text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-extrabold mt-0.5">{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Products live", value: totals?.products ?? "—", icon: Package, to: "/admin/products" },
          { label: "Customers", value: totals?.customers ?? "—", icon: TrendingUp, to: "/admin/users" },
          { label: "Visitors (30d)", value: totals?.visitors30d ?? "—", icon: Eye, to: undefined },
        ].map((s) => (
          s.to ? (
            <Link key={s.label} to={s.to} className="bg-card border rounded-xl p-5 hover:border-primary transition-colors">
              <s.icon className="h-5 w-5 text-primary mb-2" />
              <p className="text-xs uppercase font-bold text-muted-foreground">{s.label}</p>
              <p className="text-3xl font-extrabold">{s.value}</p>
            </Link>
          ) : (
            <div key={s.label} className="bg-card border rounded-xl p-5">
              <s.icon className="h-5 w-5 text-primary mb-2" />
              <p className="text-xs uppercase font-bold text-muted-foreground">{s.label}</p>
              <p className="text-3xl font-extrabold">{s.value}</p>
            </div>
          )
        ))}
      </div>

      <section className="bg-card border rounded-xl p-5 mb-6">
        <h2 className="font-bold mb-1">Last 7 days</h2>
        <p className="text-xs text-muted-foreground mb-4">Daily visitors, orders, and new sign-ups (IST)</p>
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading analytics…</p>
        ) : chartData.length ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  formatter={(value: number, name: string) => [value, name === "visitors" ? "Visitors" : name === "orders" ? "Orders" : "Sign-ups"]}
                />
                <Legend formatter={(v) => (v === "visitors" ? "Visitors" : v === "orders" ? "Orders" : "Sign-ups")} />
                <Bar dataKey="visitors" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="visitors" />
                <Bar dataKey="orders" fill="hsl(var(--chart-2, 142 76% 36%))" radius={[4, 4, 0, 0]} name="orders" />
                <Bar dataKey="signups" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="signups" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No analytics data yet. Traffic is recorded as users browse the store.</p>
        )}
        {totals && (
          <p className="text-xs text-muted-foreground mt-3 border-t pt-3">
            30-day revenue: <strong>{formatINR(totals.revenue30d)}</strong> · Orders in period: <strong>{totals.orders}</strong>
          </p>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-bold mb-3">Quick links</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link to="/admin/cj-sync" className="p-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4 shrink-0" /> CJ Import
            </Link>
            <Link to="/admin/launch" className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 font-semibold">Launch countdown</Link>
            <Link to="/admin/products" className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 font-semibold">Products</Link>
            <Link to="/admin/orders" className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 font-semibold">Orders</Link>
            <Link to="/admin/coupons" className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 font-semibold">Coupons</Link>
            <Link to="/admin/manufacturers" className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4" /> Suppliers
            </Link>
            {isAdmin && (
              <Link to="/admin/staff" className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 font-semibold">Staff</Link>
            )}
          </div>
        </div>

        <section className="bg-card border rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold">Recent Orders</h2>
            <Link to="/admin/orders" className="text-sm text-primary font-semibold">View all →</Link>
          </div>
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                <div>
                  <span className="font-semibold">{o.order_number}</span>
                  <span className="text-xs text-muted-foreground ml-2">{new Date(o.created_at).toLocaleDateString("en-IN")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{STATUS_LABEL[o.status]}</span>
                  <span className="font-bold">{formatINR(Number(o.total))}</span>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-muted-foreground text-sm py-4">No orders yet.</p>}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
