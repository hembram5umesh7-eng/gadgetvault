import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/order-utils";
import { profitFromSelling, type CJProfitEstimate } from "@/lib/cj-pricing";
import { estimateCJImportProfit, estimateStoreProductProfit } from "@/lib/cj-dropshipping.functions";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { AlertTriangle, Calculator, CheckCircle2, RefreshCw, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

type EstimateResult = CJProfitEstimate & {
  preview?: { profit: number; marginPercent: number; isLoss: boolean };
  shippingIsEstimate?: boolean;
};

interface Props {
  /** CJ catalog pid — import flow */
  productId?: string;
  /** Store UUID — flash sale / existing products */
  storeProductId?: string;
  productName: string;
  sellOverride: string;
  mrpOverride: string;
  pincode?: string;
  logisticName?: string;
  onPincodeChange?: (v: string) => void;
  onLogisticChange?: (v: string) => void;
  applyLabel?: string;
  onApply: (sell: number, mrp: number) => void;
}

export function CJImportProfitPanel({
  productId,
  storeProductId,
  productName,
  sellOverride,
  mrpOverride,
  pincode: pincodeProp,
  logisticName: logisticProp,
  onPincodeChange,
  onLogisticChange,
  applyLabel = "Apply to Import →",
  onApply,
}: Props) {
  const estimateCJFn = useAuthedServerFn(estimateCJImportProfit);
  const estimateStoreFn = useAuthedServerFn(estimateStoreProductProfit);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [pincodeLocal, setPincodeLocal] = useState("828404");
  const [logisticLocal, setLogisticLocal] = useState("");
  const [trySell, setTrySell] = useState("");

  const pincode = pincodeProp ?? pincodeLocal;
  const logisticName = logisticProp ?? logisticLocal;
  const setPincode = onPincodeChange ?? setPincodeLocal;
  const setLogisticName = onLogisticChange ?? setLogisticLocal;

  const load = async (sellPreview?: number) => {
    setLoading(true);
    try {
      const base = {
        destCountryCode: "IN" as const,
        pincode: pincode || undefined,
        logisticName: logisticName || undefined,
        sellPriceInr: sellPreview,
      };
      const res = storeProductId
        ? await estimateStoreFn({ data: { storeProductId, ...base } })
        : await estimateCJFn({ data: { productId: productId!, ...base } });
      setEstimate(res);
      if (!logisticProp && !logisticName && res.selectedShipping?.logisticName) {
        setLogisticName(res.selectedShipping.logisticName);
      }
    } catch {
      setEstimate(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTrySell(sellOverride);
  }, [sellOverride, productId, storeProductId]);

  useEffect(() => {
    void load(trySell ? Number(trySell) : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, storeProductId]);

  const preview = trySell && estimate
    ? profitFromSelling(estimate.totalCostInr, Number(trySell))
    : estimate?.preview;

  const applyRecommendation = (sellInr: number, mrpInr: number) => {
    setTrySell(String(sellInr));
    onApply(sellInr, mrpInr);
  };

  return (
    <div className="rounded-xl border-2 border-primary/25 bg-primary/5 p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-primary flex items-center gap-1.5">
            <Calculator className="h-4 w-4" /> Profit Calculator — CJ product + India shipping
          </p>
          <p className="font-bold text-sm mt-1 line-clamp-2">{productName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Landed cost = CJ product + shipping to India (aapka asli kharcha)
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => load(trySell ? Number(trySell) : undefined)}>
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label className="text-xs">India Pincode (shipping estimate)</Label>
          <Input value={pincode} onChange={(e) => setPincode(e.target.value)} className="mt-1 w-28 h-9" placeholder="828404" />
        </div>
        {estimate && estimate.shippingOptions.length > 1 && (
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">CJ Shipping Method</Label>
            <select
              value={logisticName}
              onChange={(e) => setLogisticName(e.target.value)}
              className="mt-1 h-9 w-full max-w-md px-3 rounded-md border bg-background text-sm"
            >
              {estimate.shippingOptions.map((o) => (
                <option key={o.logisticName} value={o.logisticName}>
                  {o.logisticName} — ${o.logisticPriceUsd.toFixed(2)} ({o.logisticAging} days)
                </option>
              ))}
            </select>
          </div>
        )}
        {logisticName && (
          <Button size="sm" variant="secondary" onClick={() => load(trySell ? Number(trySell) : undefined)}>
            Update shipping
          </Button>
        )}
      </div>

      {loading && !estimate ? (
        <p className="text-sm text-muted-foreground">Calculating CJ costs + shipping…</p>
      ) : estimate ? (
        <>
          {estimate.shippingIsEstimate && (
            <div className="flex gap-2 p-3 rounded-lg bg-muted border text-sm text-muted-foreground">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p>Live CJ shipping API unavailable — using fallback estimate. Link product via CJ Sync for exact freight.</p>
            </div>
          )}

          {estimate.highShippingWarning && (
            <div className="flex gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-100 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p>
                <strong>Shipping bahut zyada hai!</strong> CJ shipping (${estimate.selectedShipping.logisticPriceUsd.toFixed(2)})
                product cost (${estimate.productCostUsd.toFixed(2)}) se zyada hai. Flash sale price carefully set karo.
              </p>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-card border p-3">
              <p className="text-xs text-muted-foreground font-semibold uppercase">CJ Product</p>
              <p className="font-extrabold text-lg mt-1">${estimate.productCostUsd.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{formatINR(estimate.productCostInr)} · {estimate.variantCount} variant(s)</p>
            </div>
            <div className="rounded-lg bg-card border p-3">
              <p className="text-xs text-muted-foreground font-semibold uppercase flex items-center gap-1">
                <Truck className="h-3 w-3" /> CJ Shipping → India
              </p>
              <p className="font-extrabold text-lg mt-1">${estimate.selectedShipping.logisticPriceUsd.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{estimate.selectedShipping.logisticName} · {estimate.selectedShipping.logisticAging}</p>
            </div>
            <div className="rounded-lg bg-card border p-3 border-primary/30 bg-primary/5">
              <p className="text-xs text-primary font-semibold uppercase">Your Total Cost</p>
              <p className="font-extrabold text-lg mt-1 text-primary">{formatINR(estimate.totalCostInr)}</p>
              <p className="text-xs text-muted-foreground">${estimate.totalCostUsd.toFixed(2)} USD @ ₹{estimate.usdInrRate}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Recommended Flash Sale Price (margin)</p>
            <div className="grid sm:grid-cols-3 gap-2">
              {estimate.recommendations.map((r) => (
                <button
                  key={r.marginPercent}
                  type="button"
                  onClick={() => applyRecommendation(r.sellInr, r.mrpInr)}
                  className="text-left rounded-lg border bg-card p-3 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <p className="text-xs font-bold text-primary">{r.marginPercent}% margin</p>
                  <p className="font-extrabold">{formatINR(r.sellInr)}</p>
                  <p className="text-[10px] text-muted-foreground">Profit {formatINR(r.profitInr)} · MRP {formatINR(r.mrpInr)}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-end border-t pt-4">
            <div>
              <Label className="text-xs">Try Sale Price ₹</Label>
              <Input
                type="number"
                value={trySell}
                onChange={(e) => setTrySell(e.target.value)}
                onBlur={() => trySell && load(Number(trySell))}
                className="mt-1 w-32"
                placeholder="999"
              />
            </div>
            {preview && (
              <div className={cn("flex-1 min-w-[180px] p-3 rounded-lg border text-sm", preview.isLoss ? "bg-destructive/10 border-destructive/30" : "bg-success/10 border-success/30")}>
                {preview.isLoss ? (
                  <p className="font-bold text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Loss {formatINR(Math.abs(preview.profit))} — price badhao!</p>
                ) : (
                  <p className="font-bold text-success flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Profit {formatINR(preview.profit)} ({preview.marginPercent}% margin)</p>
                )}
              </div>
            )}
            <Button
              type="button"
              disabled={!trySell || Number(trySell) <= 0}
              onClick={() => {
                const sell = Number(trySell);
                const mrp = mrpOverride ? Number(mrpOverride) : Math.ceil(sell * 1.3);
                applyRecommendation(sell, mrp);
              }}
            >
              {applyLabel}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-destructive">Could not load CJ shipping estimate. Retry or check CJ API / product link.</p>
      )}
    </div>
  );
}
