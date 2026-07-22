import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CustomerAccountShell } from "@/components/customer-account-shell";
import { OrderCancelButton } from "@/components/order-cancel-button";
import { formatINR, ORDER_STATUSES, STATUS_LABEL, statusIndex, canCustomerCancel, type OrderStatus } from "@/lib/order-utils";
import { getCustomerOrderDetail, refreshCustomerOrderFromShopify } from "@/lib/shopify-order.functions";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/orders/$orderId")({ component: OrderDetail });

interface Order {
  id: string; order_number: string; status: OrderStatus; total: number; subtotal: number; shipping_fee: number;
  payment_method: string; payment_status: string; tracking_id: string | null; created_at: string;
  ship_full_name: string; ship_phone: string; ship_line1: string; ship_line2: string | null;
  ship_city: string; ship_state: string; ship_pincode: string;
}
interface Item {
  id: string; product_name: string; product_slug: string | null; size: string; color: string; quantity: number;
  unit_price: number;
}

function OrderDetail() {
  const { orderId } = useParams({ from: "/orders/$orderId" });
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const loadOrder = useAuthedServerFn(getCustomerOrderDetail);
  const refreshFromShopify = useAuthedServerFn(refreshCustomerOrderFromShopify);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !user) navigate({ to: "/auth", search: { redirect: `/orders/${orderId}` } });
  }, [ready, user, navigate, orderId]);

  const refresh = async (pullFromShopify = false) => {
    setLoading(true);
    try {
      const data = pullFromShopify
        ? await refreshFromShopify({ data: { orderId } })
        : await loadOrder({ data: { orderId } });
      setOrder(data.order as Order);
      setItems((data.items as Item[]) ?? []);
      setDenied(false);
    } catch {
      setDenied(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    refresh(true);
  }, [orderId, user]);

  useEffect(() => {
    if (!user || !order || order.status === "cancelled" || order.status === "delivered") return;
    const timer = window.setInterval(() => {
      void refreshFromShopify({ data: { orderId } })
        .then((data) => {
          setOrder(data.order as Order);
          setItems((data.items as Item[]) ?? []);
        })
        .catch(() => {});
    }, 25000);
    return () => window.clearInterval(timer);
  }, [orderId, user, order?.status, refreshFromShopify]);

  if (denied) return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">Order not found or you don&apos;t have access.</p>
        <Button asChild><Link to="/orders">Back to orders</Link></Button>
      </main>
      <SiteFooter />
    </div>
  );

  if (loading || !order) return (
    <div className="min-h-screen flex flex-col bg-muted/20"><SiteHeader /><div className="flex-1 container mx-auto px-4 py-12">Loading…</div><SiteFooter /></div>
  );

  const curIdx = statusIndex(order.status);
  const showProcessingNote = order.status === "received" && order.payment_status !== "failed";

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <main className="flex-1">
        <CustomerAccountShell title={`Order ${order.order_number}`} subtitle={`Placed on ${new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}`}>
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
          <Link to="/orders"><ArrowLeft className="h-4 w-4 mr-1" /> All orders</Link>
        </Button>

        {showProcessingNote && (
          <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm font-medium text-foreground">We&apos;re preparing your order</p>
            <p className="text-xs text-muted-foreground mt-1">
              You&apos;ll receive email updates as your order moves through packing and delivery.
            </p>
          </div>
        )}

        <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
          <p className="text-2xl font-extrabold">{formatINR(order.total)}</p>
          <OrderCancelButton
            orderId={order.id}
            status={order.status}
            onCancelled={() => setOrder((prev) => prev ? { ...prev, status: "cancelled" } : prev)}
          />
        </div>

        {canCustomerCancel(order.status) && (
          <p className="text-xs text-muted-foreground mb-4">
            Need to change something? You can cancel this order before it is packed for shipping.
          </p>
        )}

        {/* Items first — most important for customer */}
        <section className="bg-card border rounded-xl p-5 mb-6">
          <h2 className="font-bold mb-3">Items ({items.length})</h2>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items found for this order. Contact support with order {order.order_number}.</p>
          ) : (
            <div className="space-y-4">
              {items.map((it) => (
                <div key={it.id} className="flex gap-3 items-start border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex-1 min-w-0">
                    {it.product_slug ? (
                      <Link to="/product/$slug" params={{ slug: it.product_slug }} className="font-semibold text-sm hover:text-primary line-clamp-2">
                        {it.product_name}
                      </Link>
                    ) : (
                      <p className="font-semibold text-sm line-clamp-2">{it.product_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {it.size !== "Default" && it.size !== "One Size" ? `Size ${it.size} · ` : ""}
                      {it.color !== "Default" ? `${it.color} · ` : ""}
                      Qty {it.quantity}
                    </p>
                  </div>
                  <p className="font-bold text-sm shrink-0">{formatINR(it.unit_price * it.quantity)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tracker */}
        <section className="bg-card border rounded-xl p-5 mb-6">
          <h2 className="font-bold mb-4">Order Tracking · Live</h2>
          {order.status === "cancelled" ? (
            <p className="text-destructive font-semibold">This order was cancelled.</p>
          ) : (
            <div className="space-y-3">
              {ORDER_STATUSES.map((s, i) => {
                const done = i <= curIdx;
                const active = i === curIdx;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"} ${active ? "ring-4 ring-success/20" : ""}`}>
                      {done ? <Check className="h-4 w-4" /> : <span className="text-xs">{i + 1}</span>}
                    </div>
                    <span className={`text-sm ${done ? "font-semibold" : "text-muted-foreground"}`}>{STATUS_LABEL[s]}</span>
                  </div>
                );
              })}
            </div>
          )}
          {order.tracking_id && (
            <div className="mt-4 p-3 bg-secondary rounded-lg">
              <p className="text-xs uppercase font-bold text-muted-foreground">Tracking ID</p>
              <p className="font-mono font-semibold">{order.tracking_id}</p>
            </div>
          )}
        </section>

        <section className="bg-card border rounded-xl p-5">
          <h2 className="font-bold mb-3">Shipping & Payment</h2>
          <p className="font-semibold text-sm">{order.ship_full_name}</p>
          <p className="text-sm text-muted-foreground">{order.ship_phone}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {order.ship_line1}{order.ship_line2 ? `, ${order.ship_line2}` : ""}<br />
            {order.ship_city}, {order.ship_state} - {order.ship_pincode}
          </p>
          <div className="mt-4 pt-4 border-t text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{order.shipping_fee === 0 ? "FREE" : formatINR(order.shipping_fee)}</span></div>
            <div className="flex justify-between"><span>Payment</span><span className="uppercase">{order.payment_method} · {order.payment_status}</span></div>
            <div className="flex justify-between font-extrabold pt-2 border-t mt-2"><span>Total</span><span>{formatINR(order.total)}</span></div>
          </div>
        </section>
        </CustomerAccountShell>
      </main>
      <SiteFooter />
    </div>
  );
}
