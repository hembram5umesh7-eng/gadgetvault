import { createFileRoute, Link } from "@tanstack/react-router";
import { getShopifySetupStatus } from "@/lib/shopify-setup.functions";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatINR, ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/order-utils";
import { createShiprocketShipment } from "@/lib/shiprocket.functions";
import { retryShopifyOrderSync, syncInboundShopifyOrderStatuses } from "@/lib/shopify-order.functions";
import {
  cancelAdminOrder,
  deleteAdminOrder,
  deleteAdminOrdersBulk,
  purgeAllAdminOrders,
} from "@/lib/admin-order.functions";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  Rocket,
  Trash2,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Package,
  MapPin,
  Phone,
} from "lucide-react";

export const Route = createFileRoute("/admin/orders")({ component: AdminOrders });

interface OrderItemRow {
  id: string;
  product_name: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
}

interface OrderRow {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  payment_status: string;
  payment_method: string;
  created_at: string;
  manufacturer_id: string | null;
  ship_full_name: string;
  ship_phone: string;
  ship_line1: string;
  ship_line2: string | null;
  ship_city: string;
  ship_state: string;
  ship_pincode: string;
  admin_notes: string | null;
  tracking_id: string | null;
  courier_name: string | null;
  shiprocket_label_url: string | null;
  shopify_order_id: string | null;
  shopify_draft_order_id: string | null;
  coupon_code: string | null;
  order_items: OrderItemRow[];
}

interface Mfr {
  id: string;
  name: string;
}

function statusBadgeClass(status: OrderStatus) {
  if (status === "cancelled") return "bg-red-500/10 text-red-700 border-red-500/30";
  if (status === "delivered") return "bg-green-500/10 text-green-700 border-green-500/30";
  if (status === "shipped" || status === "packed") return "bg-blue-500/10 text-blue-700 border-blue-500/30";
  return "bg-amber-500/10 text-amber-800 border-amber-500/30";
}

function AdminOrders() {
  const { isAdmin } = useAuth();
  const createShipment = useAuthedServerFn(createShiprocketShipment);
  const retryShopify = useAuthedServerFn(retryShopifyOrderSync);
  const syncFromShopify = useAuthedServerFn(syncInboundShopifyOrderStatuses);
  const cancelOrderFn = useAuthedServerFn(cancelAdminOrder);
  const deleteOneFn = useAuthedServerFn(deleteAdminOrder);
  const deleteBulkFn = useAuthedServerFn(deleteAdminOrdersBulk);
  const purgeAllFn = useAuthedServerFn(purgeAllAdminOrders);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [mfrs, setMfrs] = useState<Mfr[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<OrderRow | null>(null);
  const [ordersScopeReady, setOrdersScopeReady] = useState(true);
  const shopifyStatusFn = useServerFn(getShopifySetupStatus);

  useEffect(() => {
    if (!isAdmin) return;
    shopifyStatusFn()
      .then((s) => setOrdersScopeReady(s.ordersScopeReady ?? false))
      .catch(() => setOrdersScopeReady(false));
  }, [isAdmin, shopifyStatusFn]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        try {
          const sync = await syncFromShopify();
          if (sync.outbound.pushed > 0) {
            toast.success(`${sync.outbound.pushed} cancelled order(s) synced to Shopify`);
          }
          if (sync.inbound.updated > 0) {
            toast.success(`${sync.inbound.updated} order(s) updated from Shopify${sync.inbound.cancelled ? ` · ${sync.inbound.cancelled} cancelled` : ""}`);
          }
        } catch {
          /* Shopify pull optional — still load local orders */
        }
      }
      const [{ data: o }, { data: m }] = await Promise.all([
        supabase
          .from("orders")
          .select("*, order_items(id, product_name, size, color, quantity, unit_price)")
          .order("created_at", { ascending: false }),
        supabase.from("manufacturers").select("id,name"),
      ]);
      setOrders((o as OrderRow[]) ?? []);
      setMfrs((m as Mfr[]) ?? []);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [isAdmin, syncFromShopify]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "cancelled");
    return {
      total: orders.length,
      active: active.length,
      cancelled: orders.length - active.length,
      revenue: active.reduce((s, o) => s + Number(o.total), 0),
      pendingShopify: orders.filter((o) => !o.shopify_order_id && o.status !== "cancelled").length,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const inItems = o.order_items?.some((it) => it.product_name.toLowerCase().includes(q));
        return (
          o.order_number.toLowerCase().includes(q) ||
          o.ship_full_name.toLowerCase().includes(q) ||
          o.ship_phone.includes(q) ||
          !!inItems
        );
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((o) => selected.has(o.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((o) => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const assignMfr = async (orderId: string, mfrId: string) => {
    if (!mfrId) return;
    const { error } = await supabase
      .from("orders")
      .update({ manufacturer_id: mfrId, status: "sent_to_manufacturer" })
      .eq("id", orderId);
    if (error) toast.error(error.message);
    else {
      toast.success("Supplier assign ho gaya");
      refresh();
    }
  };

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) toast.error(error.message);
    else {
      toast.success("Status update ho gaya");
      refresh();
    }
  };

  const saveNotes = async (orderId: string, notes: string) => {
    const { error } = await supabase.from("orders").update({ admin_notes: notes || null }).eq("id", orderId);
    if (error) toast.error(error.message);
    else toast.success("Note save ho gayi");
  };

  const shipViaShiprocket = async (orderId: string) => {
    setBusyId(orderId);
    try {
      const result = await createShipment({ data: { orderId } });
      toast.success(`AWB: ${result.awb}${result.courier ? ` · ${result.courier}` : ""}`);
      if (result.labelUrl) window.open(result.labelUrl, "_blank");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Shiprocket failed");
    } finally {
      setBusyId(null);
    }
  };

  const syncToShopify = async (orderId: string) => {
    setBusyId(orderId);
    try {
      const res = await retryShopify({ data: { orderId } });
      toast.success(res.message);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Shopify sync failed", { duration: 10000 });
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (order: OrderRow) => {
    if (!confirm(`${order.order_number} cancel karna hai? Paid order par refund try hoga.`)) return;
    setBusyId(order.id);
    try {
      const res = await cancelOrderFn({ data: { orderId: order.id } });
      toast.success(res.message);
      if (res.refundNote) toast.message(res.refundNote, { duration: 8000 });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteOne = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const res = await deleteOneFn({ data: { orderId: deleteTarget.id } });
      toast.success(res.message);
      setDeleteTarget(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selected.size) return;
    if (!confirm(`${selected.size} orders permanently delete karna hai? Ye undo nahi hoga.`)) return;
    setBulkBusy(true);
    try {
      const res = await deleteBulkFn({ data: { orderIds: [...selected] } });
      toast.success(res.message);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk delete failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const handlePurgeAll = async () => {
    if (purgeConfirm !== "DELETE ALL ORDERS") {
      toast.error('Type exactly: DELETE ALL ORDERS');
      return;
    }
    setBulkBusy(true);
    try {
      const res = await purgeAllFn({ data: { confirm: "DELETE ALL ORDERS" } });
      toast.success(res.message);
      setPurgeOpen(false);
      setPurgeConfirm("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purge failed");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <AdminShell
      title="Orders — Order Management"
      subtitle="Yahan se sab orders manage karo — Shopify mein jane ki zaroorat nahi"
      actions={
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      }
    >
      {!ordersScopeReady && (
        <div className="mb-6 rounded-xl border-2 border-red-500/40 bg-red-500/10 p-4 space-y-2">
          <p className="font-bold text-red-800 dark:text-red-300">Shopify order cancel sync abhi band hai</p>
          <p className="text-sm text-muted-foreground">
            User cancel kare toh GadgetVault update hota hai lekin Shopify par order open rehta hai — kyunki{" "}
            <strong>read_orders</strong> + <strong>write_orders</strong> scopes install nahi hue.
          </p>
          <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
            <li>Dev Dashboard → Versions → read_orders, write_orders add karo → Release</li>
            <li>Admin → Shopify Connect → <strong>Connect Shopify</strong> dubara dabao</li>
            <li>Phir yahan <strong>Refresh</strong> dabao — purane cancelled orders Shopify par push ho jayenge</li>
          </ol>
          <Button asChild size="sm" className="mt-1">
            <Link to="/admin/shopify">Open Shopify Connect</Link>
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total orders", value: stats.total },
          { label: "Active", value: stats.active },
          { label: "Cancelled", value: stats.cancelled },
          { label: "Revenue (active)", value: formatINR(stats.revenue) },
          { label: "Shopify sync pending", value: stats.pendingShopify },
        ].map((s) => (
          <div key={s.label} className="bg-card border rounded-xl p-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">{s.label}</p>
            <p className="text-xl font-extrabold mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Help */}
      <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm space-y-1">
        <p className="font-bold text-primary">Quick guide (Admin panel se sab kuch)</p>
        <ul className="text-muted-foreground text-xs space-y-0.5 list-disc pl-4">
          <li><strong>Status</strong> dropdown se order stage change karo (Received → Shipped → Delivered)</li>
          <li><strong>Supplier assign</strong> — manufacturer ko order bhejo</li>
          <li><strong>Ship via Shiprocket</strong> — AWB + label yahi se</li>
          <li><strong>Cancel</strong> — paid order par auto refund try hoga</li>
          <li><strong>Delete</strong> — ek ek ya select karke bulk delete; purane test orders hatao</li>
        </ul>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <Input
          placeholder="Search order #, customer, phone, product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-md border bg-background text-sm"
        >
          <option value="all">All statuses</option>
          {[...ORDER_STATUSES, "cancelled"].map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s as OrderStatus]}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={allFilteredSelected} onCheckedChange={toggleSelectAll} />
            Select all ({filtered.length})
          </label>
          {selected.size > 0 && (
            <Button
              size="sm"
              variant="destructive"
              disabled={bulkBusy}
              onClick={handleDeleteSelected}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete selected ({selected.size})
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="outline" className="text-destructive border-destructive/40" onClick={() => setPurgeOpen(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete ALL orders
            </Button>
          )}
        </div>
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {filtered.map((o) => {
          const isOpen = expanded.has(o.id);
          const itemCount = o.order_items?.length ?? 0;
          const isBusy = busyId === o.id;

          return (
            <div
              key={o.id}
              className={`bg-card border rounded-xl overflow-hidden ${selected.has(o.id) ? "ring-2 ring-primary/40" : ""}`}
            >
              <div className="p-4">
                <div className="flex flex-wrap gap-3 items-start">
                  <Checkbox
                    checked={selected.has(o.id)}
                    onCheckedChange={() => toggleSelect(o.id)}
                    className="mt-1"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap justify-between gap-2 mb-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-lg">{o.order_number}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusBadgeClass(o.status)}`}>
                            {STATUS_LABEL[o.status]}
                          </span>
                          {!o.shopify_order_id && o.status !== "cancelled" && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700">
                              Shopify pending
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(o.created_at).toLocaleString("en-IN")} · {o.ship_full_name} · {o.ship_city}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-lg">{formatINR(Number(o.total))}</p>
                        <p className="text-xs uppercase text-muted-foreground">
                          {o.payment_method} · {o.payment_status}
                        </p>
                      </div>
                    </div>

                    {/* Collapsed summary */}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" /> {itemCount} item{itemCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {o.ship_phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {o.ship_pincode}
                      </span>
                      {o.tracking_id && <span>AWB: {o.tracking_id}</span>}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs -ml-2"
                      onClick={() => toggleExpand(o.id)}
                    >
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                      {isOpen ? "Hide details" : "Show full details"}
                    </Button>

                    {isOpen && (
                      <div className="mt-4 space-y-4 border-t pt-4">
                        {/* Line items */}
                        <div>
                          <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Products ordered</p>
                          {itemCount === 0 ? (
                            <p className="text-sm text-amber-600">No items — broken/test order (delete kar sakte ho)</p>
                          ) : (
                            <ul className="space-y-2">
                              {o.order_items.map((it) => (
                                <li key={it.id} className="flex justify-between gap-2 text-sm bg-muted/40 rounded-lg px-3 py-2">
                                  <span>
                                    {it.product_name}
                                    {(it.size || it.color) && (
                                      <span className="text-muted-foreground"> · {it.size} {it.color}</span>
                                    )}
                                  </span>
                                  <span className="shrink-0 font-semibold">
                                    ×{it.quantity} · {formatINR(Number(it.unit_price) * it.quantity)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Address */}
                        <div className="text-sm">
                          <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Delivery address</p>
                          <p>{o.ship_full_name}</p>
                          <p className="text-muted-foreground">
                            {o.ship_line1}
                            {o.ship_line2 ? `, ${o.ship_line2}` : ""}, {o.ship_city}, {o.ship_state} — {o.ship_pincode}
                          </p>
                          <p className="text-muted-foreground">{o.ship_phone}</p>
                        </div>

                        {/* Price breakup */}
                        <div className="text-sm grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div><span className="text-muted-foreground text-xs">Subtotal</span><p className="font-semibold">{formatINR(Number(o.subtotal))}</p></div>
                          <div><span className="text-muted-foreground text-xs">Shipping</span><p className="font-semibold">{formatINR(Number(o.shipping_fee))}</p></div>
                          {Number(o.discount_amount) > 0 && (
                            <div><span className="text-muted-foreground text-xs">Discount</span><p className="font-semibold text-green-600">−{formatINR(Number(o.discount_amount))}</p></div>
                          )}
                          {o.coupon_code && (
                            <div><span className="text-muted-foreground text-xs">Coupon</span><p className="font-mono text-xs">{o.coupon_code}</p></div>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="grid sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-bold uppercase">Status change</label>
                            <select
                              value={o.status}
                              onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                              className="mt-1 w-full h-9 text-sm px-2 rounded border bg-background"
                            >
                              {[...ORDER_STATUSES, "cancelled"].map((s) => (
                                <option key={s} value={s}>{STATUS_LABEL[s as OrderStatus]}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase">Assign supplier</label>
                            <select
                              defaultValue={o.manufacturer_id ?? ""}
                              onChange={(e) => assignMfr(o.id, e.target.value)}
                              className="mt-1 w-full h-9 text-sm px-2 rounded border bg-background"
                            >
                              <option value="">— select supplier —</option>
                              {mfrs.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase">Admin note (internal)</label>
                            <Input defaultValue={o.admin_notes ?? ""} id={`note-${o.id}`} className="mt-1 h-9" placeholder="Note…" />
                            <button
                              type="button"
                              className="text-xs text-primary mt-1 font-semibold"
                              onClick={() => {
                                const el = document.getElementById(`note-${o.id}`) as HTMLInputElement;
                                saveNotes(o.id, el.value);
                              }}
                            >
                              Save note
                            </button>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                          {!o.shopify_order_id && o.status !== "cancelled" && (
                            <Button size="sm" variant="outline" disabled={isBusy} onClick={() => syncToShopify(o.id)}>
                              {isBusy ? "Syncing…" : "Sync to Shopify (background)"}
                            </Button>
                          )}
                          {o.status !== "cancelled" && (
                            <Button size="sm" variant="outline" disabled={isBusy} onClick={() => shipViaShiprocket(o.id)}>
                              <Rocket className="h-3.5 w-3.5 mr-1" />
                              {isBusy ? "Creating…" : "Ship via Shiprocket"}
                            </Button>
                          )}
                          {o.shiprocket_label_url && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={o.shiprocket_label_url} target="_blank" rel="noreferrer">Label PDF</a>
                            </Button>
                          )}
                          {o.status !== "cancelled" && (
                            <Button size="sm" variant="outline" disabled={isBusy} onClick={() => handleCancel(o)}>
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel order
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isBusy}
                            onClick={() => setDeleteTarget(o)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete permanently
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <Link to="/orders/$orderId" params={{ orderId: o.id }} target="_blank">
                              Customer view →
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingCartPlaceholder />
            <p className="mt-2">Koi order nahi mila.</p>
          </div>
        )}
      </div>

      {/* Delete one dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Order delete karna hai?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.order_number}</strong> permanently delete ho jayega. Ye undo nahi hoga.
              Shopify par order alag se manage karna padega agar sync ho chuka hai.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOne} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Purge all dialog */}
      <AlertDialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Saare orders delete karo?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                <strong>{stats.total} orders</strong> permanently delete ho jayenge. Products aur categories safe rahenge.
                Fresh start ke liye use karo.
              </p>
              <p>Type <code className="font-mono bg-muted px-1 rounded">DELETE ALL ORDERS</code> to confirm:</p>
              <Input
                value={purgeConfirm}
                onChange={(e) => setPurgeConfirm(e.target.value)}
                placeholder="DELETE ALL ORDERS"
                className="font-mono"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPurgeConfirm("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurgeAll}
              disabled={bulkBusy || purgeConfirm !== "DELETE ALL ORDERS"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkBusy ? "Deleting…" : "Delete all orders"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

function ShoppingCartPlaceholder() {
  return (
    <svg className="mx-auto h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
