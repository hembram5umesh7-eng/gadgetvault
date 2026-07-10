import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CJImportProfitPanel } from "@/components/cj-import-profit-panel";
import { searchCJProducts, importCJProducts, getCJStatus } from "@/lib/cj-dropshipping.functions";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { cjUsdToInr, parseCJPrice, type CJListProduct } from "@/lib/cj-dropshipping";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/order-utils";
import { Search, Download, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/cj-sync")({ component: CJSyncPage });

const QUICK_SEARCH = ["earbuds", "smart watch", "fast charger", "power bank", "phone case", "bluetooth speaker"];

function CJSyncPage() {
  const searchFn = useAuthedServerFn(searchCJProducts);
  const importFn = useAuthedServerFn(importCJProducts);
  const statusFn = useAuthedServerFn(getCJStatus);

  const [keyword, setKeyword] = useState("earbuds");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<CJListProduct[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [categorySlug, setCategorySlug] = useState("unique-gadgets");
  const [markup, setMarkup] = useState(45);
  const [sellOverride, setSellOverride] = useState("");
  const [mrpOverride, setMrpOverride] = useState("");
  const [conn, setConn] = useState<{ configured: boolean; connected: boolean; message: string } | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [statusLoading, setStatusLoading] = useState(true);

  const runSearch = useCallback(async (kw: string, p = 1) => {
    setLoading(true);
    try {
      const res = await searchFn({ data: { keyword: kw, page: p } });
      setResults(res.products);
      setPage(p);
      setSelected(new Set());
      if (!res.products.length) toast.message("No CJ products found — try another keyword");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "CJ search failed");
    } finally {
      setLoading(false);
    }
  }, [searchFn]);

  useEffect(() => {
    supabase.from("categories").select("slug,name").eq("active", true).order("sort_order").then(({ data }) => {
      setCategories((data as { slug: string; name: string }[]) ?? []);
    });
    supabase.from("products").select("*", { count: "exact", head: true }).eq("fulfillment_source", "cj")
      .then(({ count }) => setImportedCount(count ?? 0));

    let cancelled = false;
    (async () => {
      setStatusLoading(true);
      try {
        const s = await statusFn({ data: {} });
        if (cancelled) return;
        setConn(s);
        if (s.connected) await runSearch("earbuds", 1);
      } catch (err) {
        if (cancelled) return;
        setConn({
          configured: false,
          connected: false,
          message: err instanceof Error ? err.message : "Status check failed — log in as admin",
        });
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [statusFn, runSearch]);

  const toggle = (pid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const runImport = async () => {
    if (!selected.size) { toast.error("Select at least one product"); return; }
    setImporting(true);
    try {
      const res = await importFn({
        data: {
          productIds: [...selected],
          categorySlug,
          markupPercent: markup,
          sellPriceInr: sellOverride ? Number(sellOverride) : undefined,
          marketingPriceInr: mrpOverride ? Number(mrpOverride) : undefined,
        },
      });
      toast.success(`${res.imported} imported · ${res.failed} failed`);
      if (res.failed) {
        res.results.filter((r) => !r.ok).forEach((r) => toast.error(`${r.name}: ${r.error}`));
      }
      setSelected(new Set());
      setImportedCount((c) => c + res.imported);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminShell
      title="CJ Dropshipping Sync"
      subtitle="Search CJ → profit calculator se shipping + selling price decide karo → import. Orders auto-send to CJ."
      actions={
        <Button variant="outline" asChild>
          <Link to="/admin/products">View Store Products →</Link>
        </Button>
      }
    >
      {/* Connection status */}
      <div className={cn(
        "rounded-xl border p-4 mb-6 flex flex-wrap items-center gap-3",
        conn?.connected ? "bg-success/5 border-success/30" : statusLoading ? "bg-muted/30 border-border" : "bg-amber-50 border-amber-200 dark:bg-amber-950/20",
      )}>
        {statusLoading ? (
          <RefreshCw className="h-5 w-5 text-muted-foreground shrink-0 animate-spin" />
        ) : conn?.connected ? (
          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
        )}
        <div className="flex-1 min-w-[200px]">
          <p className="font-bold text-sm">
            {statusLoading ? "Connecting to CJ…" : conn?.connected ? "CJ API Connected ✓" : "CJ API Not Connected"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {statusLoading ? "Please wait…" : conn?.message ?? "Unknown"} · {importedCount} CJ products in store
          </p>
        </div>
        {!statusLoading && !conn?.connected && (
          <Button size="sm" variant="outline" onClick={() => {
            setStatusLoading(true);
            statusFn({ data: {} }).then((s) => { setConn(s); if (s.connected) runSearch("earbuds", 1); })
              .catch((e) => setConn({ configured: false, connected: false, message: e instanceof Error ? e.message : "Failed" }))
              .finally(() => setStatusLoading(false));
          }}>
            Retry Connection
          </Button>
        )}
      </div>

      {/* How it works */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6 text-sm">
        {[
          { step: "1", title: "Search CJ", desc: "Earbuds, watches, chargers — keyword se dhundho" },
          { step: "2", title: "Check Profit", desc: "Select product → CJ shipping + profit calculator dekho" },
          { step: "3", title: "Import", desc: "Selling & MRP set karke import — orders auto CJ ko jayenge" },
        ].map((s) => (
          <div key={s.step} className="rounded-xl border bg-card p-4">
            <span className="text-xs font-bold text-primary">STEP {s.step}</span>
            <p className="font-extrabold mt-1">{s.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
          </div>
        ))}
      </div>

      {selected.size === 1 && (() => {
        const pid = [...selected][0];
        const p = results.find((r) => r.pid === pid);
        if (!p) return null;
        return (
          <CJImportProfitPanel
            key={pid}
            productId={pid}
            productName={p.nameEn}
            sellOverride={sellOverride}
            mrpOverride={mrpOverride}
            onApply={(sell, mrp) => {
              setSellOverride(String(sell));
              setMrpOverride(String(mrp));
              toast.success(`Selling ${formatINR(sell)} · MRP ${formatINR(mrp)} applied`);
            }}
          />
        );
      })()}

      {/* Search */}
      <div className="rounded-xl border bg-card p-4 mb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {QUICK_SEARCH.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => { setKeyword(q); runSearch(q, 1); }}
              className="px-3 py-1 rounded-full text-xs font-bold border hover:bg-primary/5 hover:border-primary/40"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search CJ products…"
            className="max-w-sm"
            onKeyDown={(e) => e.key === "Enter" && runSearch(keyword)}
          />
          <Button onClick={() => runSearch(keyword)} disabled={loading || statusLoading}>
            <Search className="h-4 w-4" /> {loading ? "Searching…" : "Search CJ"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-4 items-end border-t pt-4">
          <div>
            <Label className="text-xs">Import to Category</Label>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="mt-1 h-9 px-3 rounded-md border bg-background text-sm block"
            >
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Markup % (USD → ₹)</Label>
            <Input
              type="number"
              min={0}
              max={300}
              value={markup}
              onChange={(e) => setMarkup(Number(e.target.value))}
              className="mt-1 w-24"
            />
          </div>
          <div>
            <Label className="text-xs">Override Selling ₹</Label>
            <Input value={sellOverride} onChange={(e) => setSellOverride(e.target.value)} placeholder="Auto" className="mt-1 w-28" />
          </div>
          <div>
            <Label className="text-xs">Override MRP ₹</Label>
            <Input value={mrpOverride} onChange={(e) => setMrpOverride(e.target.value)} placeholder="Auto" className="mt-1 w-28" />
          </div>
          <Button onClick={runImport} disabled={importing || !selected.size} className="font-bold">
            <Download className="h-4 w-4" />
            {importing ? "Importing…" : `Import ${selected.size} to Store`}
          </Button>
        </div>
      </div>

      {/* Results */}
      {results.length === 0 && !loading ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl">
          <RefreshCw className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">Search CJ catalog to import products</p>
          <p className="text-sm mt-1">Try: earbuds, smart watch, power bank</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {results.map((p) => {
            const priceInr = cjUsdToInr(parseCJPrice(p.sellPriceUsd), markup);
            const usd = parseCJPrice(p.sellPriceUsd);
            const isSelected = selected.has(p.pid);
            return (
              <button
                key={p.pid}
                type="button"
                onClick={() => toggle(p.pid)}
                className={cn(
                  "text-left rounded-xl border overflow-hidden transition-all hover:border-primary/50",
                  isSelected ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "bg-card",
                )}
              >
                <div className="aspect-square bg-muted relative">
                  {p.image ? (
                    <img src={p.image} alt="" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
                  )}
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-bold text-sm line-clamp-2">{p.nameEn}</p>
                  <p className="text-xs text-muted-foreground mt-1">{p.categoryHint || p.sku}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-muted-foreground">{usd > 0 ? `$${usd.toFixed(2)} USD` : "Price on import"}</span>
                    <span className="font-extrabold text-primary">{priceInr > 0 ? formatINR(priceInr) : "—"}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {results.length > 0 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button variant="outline" disabled={page <= 1 || loading} onClick={() => runSearch(keyword, page - 1)}>
            ← Previous
          </Button>
          <span className="flex items-center text-sm text-muted-foreground px-2">Page {page}</span>
          <Button variant="outline" disabled={loading} onClick={() => runSearch(keyword, page + 1)}>
            Next →
          </Button>
        </div>
      )}
    </AdminShell>
  );
}
