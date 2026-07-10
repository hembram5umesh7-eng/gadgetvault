import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR, ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/order-utils";
import { createShiprocketShipment } from "@/lib/shiprocket.functions";
import { fixCJOrderLogistics, retryCJOrder } from "@/lib/cj-dropshipping.functions";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { toast } from "sonner";
import { Rocket, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({ component: AdminOrders });

interface OrderRow {
  id: string; order_number: string; status: OrderStatus; total: number; payment_status: string;
  payment_method: string; created_at: string; manufacturer_id: string | null;
  ship_full_name: string; ship_city: string; ship_pincode: string; admin_notes: string | null;
  tracking_id: string | null; courier_name: string | null; shiprocket_label_url: string | null;
  cj_order_id: string | null; cj_status: string | null; cj_error: string | null; cj_tracking_number: string | null;
}
interface Mfr { id: string; name: string }

function AdminOrders() {
  const createShipment = useAuthedServerFn(createShiprocketShipment);
  const retryCJ = useAuthedServerFn(retryCJOrder);
  const fixCJLogistics = useAuthedServerFn(fixCJOrderLogistics);
  const [shippingId, setShippingId] = useState<string | null>(null);
  const [cjRetryId, setCjRetryId] = useState<string | null>(null);
  const [cjLogisticsId, setCjLogisticsId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [mfrs, setMfrs] = useState<Mfr[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const refresh = async () => {
    const [{ data: o }, { data: m }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("manufacturers").select("id,name"),
    ]);
    setOrders((o as OrderRow[]) ?? []);
    setMfrs((m as Mfr[]) ?? []);
  };
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return o.order_number.toLowerCase().includes(q) || o.ship_full_name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  const assignMfr = async (orderId: string, mfrId: string) => {
    if (!mfrId) return;
    const { error } = await supabase.from("orders").update({ manufacturer_id: mfrId, status: "sent_to_manufacturer" }).eq("id", orderId);
    if (error) toast.error(error.message); else { toast.success("Assigned to supplier"); refresh(); }
  };

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) toast.error(error.message); else { toast.success("Status updated"); refresh(); }
  };

  const saveNotes = async (orderId: string, notes: string) => {
    const { error } = await supabase.from("orders").update({ admin_notes: notes || null }).eq("id", orderId);
    if (error) toast.error(error.message); else toast.success("Notes saved");
  };

  const shipViaShiprocket = async (orderId: string) => {
    setShippingId(orderId);
    try {
      const result = await createShipment({ data: { orderId } });
      toast.success(`AWB: ${result.awb}${result.courier ? ` · ${result.courier}` : ""}${result.pickupLocation ? ` · Pickup: ${result.pickupLocation}` : ""}`);
      if (result.labelUrl) window.open(result.labelUrl, "_blank");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Shiprocket failed");
    } finally {
      setShippingId(null);
    }
  };

  const resendToCJ = async (orderId: string) => {
    setCjRetryId(orderId);
    try {
      const res = await retryCJ({ data: { orderId } });
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "CJ retry failed");
    } finally {
      setCjRetryId(null);
    }
  };

  const applyCJLogistics = async (orderId: string) => {
    setCjLogisticsId(orderId);
    try {
      const res = await fixCJLogistics({ data: { orderId } });
      toast.success(res.message);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "CJ shipping fix failed");
    } finally {
      setCjLogisticsId(null);
    }
  };

  return (
    <AdminShell title="Orders" subtitle={`${orders.length} total orders`}>
      <div className="flex flex-wrap gap-3 mb-4">
        <Input placeholder="Search order # or customer…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-md border bg-background text-sm">
          <option value="all">All statuses</option>
          {[...ORDER_STATUSES, "cancelled"].map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s as OrderStatus]}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((o) => (
          <div key={o.id} className="bg-card border rounded-xl p-4">
            <div className="flex flex-wrap justify-between gap-2 mb-3">
              <div>
                <Link to="/orders/$orderId" params={{ orderId: o.id }} className="font-bold text-lg hover:text-primary">
                  {o.order_number}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("en-IN")} · {o.ship_full_name} · {o.ship_city}
                </p>
              </div>
              <div className="text-right">
                <p className="font-extrabold">{formatINR(Number(o.total))}</p>
                <p className="text-xs uppercase text-muted-foreground">{o.payment_method} · {o.payment_status}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold uppercase">Status</label>
                <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)} className="mt-1 w-full h-9 text-sm px-2 rounded border bg-background">
                  {[...ORDER_STATUSES, "cancelled"].map((s) => <option key={s} value={s}>{STATUS_LABEL[s as OrderStatus]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase">Assign supplier</label>
                <select defaultValue={o.manufacturer_id ?? ""} onChange={(e) => assignMfr(o.id, e.target.value)} className="mt-1 w-full h-9 text-sm px-2 rounded border bg-background">
                  <option value="">— select —</option>
                  {mfrs.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase">Admin notes</label>
                <Input defaultValue={o.admin_notes ?? ""} id={`note-${o.id}`} className="mt-1 h-9" placeholder="Internal note…" />
                <button type="button" className="text-xs text-primary mt-1 font-semibold" onClick={() => {
                  const el = document.getElementById(`note-${o.id}`) as HTMLInputElement;
                  saveNotes(o.id, el.value);
                }}>Save note</button>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-2">
              {o.cj_order_id ? (
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300">
                  CJ: {o.cj_order_id} {o.cj_status ? `· ${o.cj_status}` : ""}
                </span>
              ) : o.cj_error ? (
                <span className="text-xs text-destructive font-medium">CJ error: {o.cj_error}</span>
              ) : null}
              <Button size="sm" variant="outline" disabled={cjRetryId === o.id} onClick={() => resendToCJ(o.id)}>
                {cjRetryId === o.id ? "Sending…" : "Send to CJ"}
              </Button>
              {o.cj_order_id && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={cjLogisticsId === o.id}
                  onClick={() => applyCJLogistics(o.id)}
                >
                  {cjLogisticsId === o.id ? "Fixing…" : "Fix CJ Shipping"}
                </Button>
              )}
              <Button
                size="sm"
                disabled={shippingId === o.id}
                onClick={() => shipViaShiprocket(o.id)}
              >
                <Rocket className="h-3.5 w-3.5" />
                {shippingId === o.id ? "Creating…" : "Ship via Shiprocket"}
              </Button>
              {o.tracking_id && (
                <span className="text-xs font-semibold text-muted-foreground">
                  AWB: {o.tracking_id}{o.courier_name ? ` · ${o.courier_name}` : ""}
                </span>
              )}
              {o.shiprocket_label_url && (
                <Button size="sm" variant="outline" asChild>
                  <a href={o.shiprocket_label_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> Label PDF
                  </a>
                </Button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No orders found.</p>}
      </div>
    </AdminShell>
  );
}
