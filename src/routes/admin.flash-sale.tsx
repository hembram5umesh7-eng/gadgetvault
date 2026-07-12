import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CJImportProfitPanel } from "@/components/cj-import-profit-panel";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import {
  getFlashSaleAdmin,
  saveFlashSaleAdmin,
  type FlashSaleAdminProduct,
} from "@/lib/flash-sale.functions";
import { estimateStoreProductProfit } from "@/lib/cj-dropshipping.functions";
import { useCategories } from "@/lib/categories";
import {
  flashSaleLandedProfit,
  salePriceFromLandedMargin,
  type FlashSaleSettings,
} from "@/lib/flash-sale-settings";
import { profitFromSelling, type CJProfitEstimate } from "@/lib/cj-pricing";
import { formatINR } from "@/lib/order-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, RefreshCw, Save, Search, Zap } from "lucide-react";

export const Route = createFileRoute("/admin/flash-sale")({
  component: AdminFlashSalePage,
});

type LandedEstimate = CJProfitEstimate & {
  preview?: { profit: number; marginPercent: number; isLoss: boolean };
  shippingIsEstimate?: boolean;
};

function AdminFlashSalePage() {
  const loadFn = useAuthedServerFn(getFlashSaleAdmin);
  const saveFn = useAuthedServerFn(saveFlashSaleAdmin);
  const estimateFn = useAuthedServerFn(estimateStoreProductProfit);
  const { categories } = useCategories();

  const [settings, setSettings] = useState<FlashSaleSettings | null>(null);
  const [catalog, setCatalog] = useState<FlashSaleAdminProduct[]>([]);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [calcMargin, setCalcMargin] = useState("30");
  const [pincode, setPincode] = useState("828404");
  const [logisticName, setLogisticName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [landed, setLanded] = useState<Record<string, LandedEstimate>>({});
  const [loadingCosts, setLoadingCosts] = useState(false);

  const load = useCallback(async () => {
    const res = await loadFn();
    setSettings(res.settings);
    setCatalog(res.catalog);
  }, [loadFn]);

  useEffect(() => {
    load().catch((e) => toast.error(e instanceof Error ? e.message : "Load failed"));
  }, [load]);

  const loadLandedCost = useCallback(
    async (p: FlashSaleAdminProduct, sellPreview?: number) => {
      if (!p.cj_cost_usd && !p.cj_product_id) return null;
      try {
        const est = await estimateFn({
          data: {
            storeProductId: p.id,
            pincode: pincode || undefined,
            logisticName: logisticName || undefined,
            sellPriceInr: sellPreview ?? p.salePrice,
          },
        });
        setLanded((prev) => ({ ...prev, [p.id]: est }));
        return est;
      } catch {
        return null;
      }
    },
    [estimateFn, pincode, logisticName],
  );

  const refreshAllCosts = async () => {
    const targets = catalog.filter((p) => p.inFlashSale && (p.cj_cost_usd || p.cj_product_id));
    if (!targets.length) {
      toast.error("No CJ-linked products in flash sale");
      return;
    }
    setLoadingCosts(true);
    let ok = 0;
    for (const p of targets) {
      const est = await loadLandedCost(p);
      if (est) ok++;
    }
    setLoadingCosts(false);
    toast.success(`Landed cost loaded for ${ok}/${targets.length} products`);
  };

  const toggleCategory = (slug: string, on: boolean) => {
    if (!settings) return;
    const nextSlugs = on
      ? [...settings.categorySlugs, slug]
      : settings.categorySlugs.filter((s) => s !== slug);
    setSettings({ ...settings, categorySlugs: nextSlugs });
    setCatalog((prev) =>
      prev.map((p) => {
        if (p.category !== slug) return p;
        if (on) return { ...p, inFlashSale: true, salePrice: p.salePrice || p.base_price };
        return { ...p, inFlashSale: false };
      }),
    );
  };

  const updateProduct = (id: string, patch: Partial<FlashSaleAdminProduct>) => {
    setCatalog((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    if (patch.salePrice != null && landed[id]) {
      const est = landed[id];
      const preview = profitFromSelling(est.totalCostInr, patch.salePrice);
      setLanded((prev) => ({ ...prev, [id]: { ...est, preview } }));
    }
  };

  const included = useMemo(() => catalog.filter((p) => p.inFlashSale), [catalog]);
  const includedCount = included.length;

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return included;
    return included.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.includes(q),
    );
  }, [included, filter]);

  const summary = useMemo(() => {
    let inProfit = 0;
    let inLoss = 0;
    let pending = 0;
    for (const p of included) {
      const est = landed[p.id];
      if (!est) {
        pending++;
        continue;
      }
      const { isLoss } = profitFromSelling(est.totalCostInr, p.salePrice);
      if (isLoss) inLoss++;
      else inProfit++;
    }
    return { inProfit, inLoss, pending };
  }, [included, landed]);

  const selected = selectedId ? catalog.find((p) => p.id === selectedId) ?? null : null;

  const save = async () => {
    if (!settings) return;
    if (summary.inLoss > 0) {
      const ok = window.confirm(
        `${summary.inLoss} product(s) flash sale price par LOSS mein hain. Phir bhi save karna hai?`,
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      const items = included.map((p) => ({
        productId: p.id,
        salePrice: Math.round(p.salePrice),
        displayMrp: p.displayMrp ? Math.round(p.displayMrp) : null,
      }));
      if (settings.enabled && items.length === 0) {
        toast.error("Enable at least one category or product for Flash Sale");
        setBusy(false);
        return;
      }
      const res = await saveFn({
        data: {
          enabled: settings.enabled,
          title: settings.title,
          subtitle: settings.subtitle,
          categorySlugs: settings.categorySlugs,
          items,
        },
      });
      toast.success(`Flash Sale saved — ${res.productCount} products synced`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (!settings) {
    return (
      <AdminShell title="Flash Sale" subtitle="Loading…">
        <p className="text-sm text-muted-foreground">Loading flash sale settings…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Flash Sale Control"
      subtitle="CJ product + India shipping = real landed cost. Profit/loss clearly before you publish."
      actions={
        <Button onClick={() => void save()} disabled={busy} className="gap-2 font-bold">
          <Save className="h-4 w-4" />
          {busy ? "Saving…" : "Save & Sync Store"}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Profit summary */}
        {includedCount > 0 && (
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border bg-success/10 border-success/30 p-4">
              <p className="text-xs font-bold uppercase text-success flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> In Profit
              </p>
              <p className="text-2xl font-extrabold mt-1">{summary.inProfit}</p>
            </div>
            <div className="rounded-xl border bg-destructive/10 border-destructive/30 p-4">
              <p className="text-xs font-bold uppercase text-destructive flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> In Loss
              </p>
              <p className="text-2xl font-extrabold mt-1">{summary.inLoss}</p>
            </div>
            <div className="rounded-xl border bg-muted/50 p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">Cost not loaded</p>
              <p className="text-2xl font-extrabold mt-1">{summary.pending}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                disabled={loadingCosts}
                onClick={() => void refreshAllCosts()}
              >
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1", loadingCosts && "animate-spin")} />
                Load all CJ costs
              </Button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-6">
            <div className="bg-card border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" /> Flash Sale Master
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    OFF = homepage deals + /deals hidden
                  </p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(v) => setSettings({ ...settings, enabled: v })}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Section title</Label>
                  <Input
                    className="mt-1"
                    value={settings.title}
                    onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Subtitle</Label>
                  <Input
                    className="mt-1"
                    value={settings.subtitle}
                    onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-5">
              <h2 className="font-bold mb-3">Categories in Flash Sale</h2>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const on = settings.categorySlugs.includes(c.slug);
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => toggleCategory(c.slug, !on)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-sm font-semibold border transition-colors",
                        on ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted",
                      )}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-card border rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="font-bold">Products ({includedCount} in sale)</h2>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="text-xs uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="text-left p-2">Sale</th>
                      <th className="text-left p-2">Product</th>
                      <th className="text-left p-2">Landed cost</th>
                      <th className="text-left p-2">Shipping</th>
                      <th className="text-left p-2">Regular</th>
                      <th className="text-left p-2">Sale ₹</th>
                      <th className="text-left p-2">MRP</th>
                      <th className="text-left p-2">Net profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const est = landed[p.id];
                      const totalCost = est?.totalCostInr;
                      const shipUsd = est?.selectedShipping?.logisticPriceUsd;
                      const rowProfit = totalCost
                        ? flashSaleLandedProfit(totalCost, p.salePrice)
                        : null;
                      return (
                        <tr
                          key={p.id}
                          className={cn(
                            "border-b last:border-0 cursor-pointer hover:bg-muted/30",
                            selectedId === p.id && "bg-primary/5",
                            rowProfit?.isLoss && "bg-destructive/5",
                          )}
                          onClick={() => setSelectedId(p.id)}
                        >
                          <td className="p-2" onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={p.inFlashSale}
                              onCheckedChange={(v) =>
                                updateProduct(p.id, {
                                  inFlashSale: v,
                                  salePrice: v ? p.salePrice || p.base_price : p.salePrice,
                                })
                              }
                            />
                          </td>
                          <td className="p-2">
                            <p className="font-semibold line-clamp-1">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">
                              {p.category.replace(/-/g, " ")}
                              {p.fulfillment_source === "cj" && " · CJ"}
                            </p>
                          </td>
                          <td className="p-2">
                            {totalCost != null ? (
                              <span className="font-semibold text-primary">{formatINR(totalCost)}</span>
                            ) : (
                              <button
                                type="button"
                                className="text-xs text-primary underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void loadLandedCost(p);
                                }}
                              >
                                Load cost
                              </button>
                            )}
                          </td>
                          <td className="p-2 text-muted-foreground text-xs">
                            {shipUsd != null ? `$${shipUsd.toFixed(2)}` : "—"}
                          </td>
                          <td className="p-2">{formatINR(p.base_price)}</td>
                          <td className="p-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              min={1}
                              className="h-9 w-24"
                              value={p.salePrice}
                              disabled={!p.inFlashSale}
                              onChange={(e) => updateProduct(p.id, { salePrice: Number(e.target.value) || 0 })}
                            />
                          </td>
                          <td className="p-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              min={1}
                              className="h-9 w-24"
                              value={p.displayMrp ?? ""}
                              placeholder="Auto"
                              disabled={!p.inFlashSale}
                              onChange={(e) =>
                                updateProduct(p.id, {
                                  displayMrp: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                            />
                          </td>
                          <td className="p-2">
                            {rowProfit && rowProfit.profit != null ? (
                              <span
                                className={cn(
                                  "font-bold text-xs",
                                  rowProfit.isLoss ? "text-destructive" : "text-emerald-600",
                                )}
                              >
                                {rowProfit.isLoss ? "−" : "+"}
                                {formatINR(Math.abs(rowProfit.profit))} ({rowProfit.marginPct}%)
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Load cost</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 max-h-40 overflow-y-auto border rounded-lg divide-y">
                {catalog
                  .filter((p) => !p.inFlashSale)
                  .slice(0, 30)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex justify-between"
                      onClick={() =>
                        updateProduct(p.id, {
                          inFlashSale: true,
                          salePrice: p.base_price,
                          displayMrp: p.marketing_price,
                        })
                      }
                    >
                      <span className="line-clamp-1">{p.name}</span>
                      <span className="text-primary font-semibold shrink-0 ml-2">+ Add</span>
                    </button>
                  ))}
              </div>
            </div>

            {selected && selected.inFlashSale && (
              <CJImportProfitPanel
                key={selected.id}
                storeProductId={selected.id}
                productName={selected.name}
                sellOverride={String(selected.salePrice)}
                mrpOverride={selected.displayMrp ? String(selected.displayMrp) : ""}
                pincode={pincode}
                logisticName={logisticName}
                onPincodeChange={setPincode}
                onLogisticChange={setLogisticName}
                applyLabel="Apply to Flash Sale →"
                onApply={(sell, mrp) => {
                  updateProduct(selected.id, { salePrice: sell, displayMrp: mrp });
                  void loadLandedCost({ ...selected, salePrice: sell }, sell);
                  toast.success(`Sale ${formatINR(sell)} · MRP ${formatINR(mrp)} applied`);
                }}
              />
            )}
          </div>

          <aside className="space-y-4 h-fit lg:sticky lg:top-24">
            <div className="bg-card border rounded-xl p-5 space-y-4">
              <h3 className="font-bold">Bulk pricing</h3>
              <p className="text-xs text-muted-foreground">
                Pehle &quot;Load all CJ costs&quot; dabao — phir margin sab included products par apply hoga (landed cost par).
              </p>
              <div>
                <Label>India pincode</Label>
                <Input className="mt-1" value={pincode} onChange={(e) => setPincode(e.target.value)} />
              </div>
              <div>
                <Label>Target margin %</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  className="mt-1"
                  value={calcMargin}
                  onChange={(e) => setCalcMargin(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const margin = Number(calcMargin) || 30;
                  let applied = 0;
                  setCatalog((prev) =>
                    prev.map((p) => {
                      if (!p.inFlashSale) return p;
                      const est = landed[p.id];
                      if (!est?.totalCostInr) return p;
                      applied++;
                      return {
                        ...p,
                        salePrice: salePriceFromLandedMargin(est.totalCostInr, margin),
                        displayMrp: Math.ceil(salePriceFromLandedMargin(est.totalCostInr, margin) * 1.3),
                      };
                    }),
                  );
                  if (!applied) toast.error("Load CJ costs first (Load all CJ costs button)");
                  else toast.success(`${margin}% margin applied to ${applied} products (product + shipping cost)`);
                }}
              >
                Apply margin to all (landed cost)
              </Button>
            </div>

            <div className="bg-muted/40 border rounded-xl p-4 text-xs text-muted-foreground space-y-2">
              <p>
                <strong className="text-foreground">Landed cost</strong> = CJ product USD + India shipping USD → INR.
                Import calculator jaisa hi logic.
              </p>
              <p>Red rows = loss at current flash sale price. Click row for full calculator.</p>
            </div>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}
