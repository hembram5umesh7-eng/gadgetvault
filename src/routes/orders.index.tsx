import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CustomerAccountShell } from "@/components/customer-account-shell";
import { OrderCancelButton } from "@/components/order-cancel-button";
import { formatINR, STATUS_LABEL, canCustomerCancel, type OrderStatus } from "@/lib/order-utils";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/orders/")({ component: OrdersList });

interface OrderRow { id: string; order_number: string; status: OrderStatus; total: number; created_at: string }

function OrdersList() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const load = () => {
    if (!user) return;
    supabase.from("orders").select("id,order_number,status,total,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as OrderRow[]) ?? []));
  };

  useEffect(() => {
    if (ready && !user) navigate({ to: "/auth", search: { redirect: "/orders" } });
  }, [ready, user, navigate]);

  useEffect(() => { load(); }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <main className="flex-1">
        <CustomerAccountShell title="My Orders" subtitle="Track, view details, or cancel before shipping">
        {orders.length === 0 ? (
          <p className="text-muted-foreground p-4 bg-card border rounded-xl">No orders yet. <Link to="/" className="text-primary font-semibold">Start shopping</Link></p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="p-4 bg-card border rounded-xl hover:border-primary/40 transition-colors">
                <Link to="/orders/$orderId" params={{ orderId: o.id }} className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-bold">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
                    <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${o.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-secondary"}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="font-extrabold">{formatINR(o.total)}</p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                {canCustomerCancel(o.status) && (
                  <div className="mt-3 pt-3 border-t flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <OrderCancelButton orderId={o.id} status={o.status} size="sm" onCancelled={load} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </CustomerAccountShell>
      </main>
      <SiteFooter />
    </div>
  );
}
