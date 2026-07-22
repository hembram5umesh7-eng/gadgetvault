/**
 * Copy to: src/routes/admin.flash-sale.tsx
 */
import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CJImportProfitPanel } from "@/components/cj-import-profit-panel";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { getFlashSaleAdmin, saveFlashSaleAdmin } from "@/lib/flash-sale.functions";
import { estimateStoreProductProfit } from "@/lib/cj-dropshipping.functions";
import { useCategories } from "@/lib/categories";
import { formatINR } from "@/lib/order-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, RefreshCw, Save, Search, Zap } from "lucide-react";
import { AdminFlashSalePanel } from "@flash-sale-template";

export const Route = createFileRoute("/admin/flash-sale")({
  component: AdminFlashSalePage,
});

function AdminFlashSalePage() {
  const loadFn = useAuthedServerFn(getFlashSaleAdmin);
  const saveFn = useAuthedServerFn(saveFlashSaleAdmin);
  const estimateFn = useAuthedServerFn(estimateStoreProductProfit);
  const { categories } = useCategories();

  return (
    <AdminShell
      title="Flash Sale Control"
      subtitle="CJ product + India shipping = real landed cost."
    >
      <AdminFlashSalePanel
        categories={categories}
        formatPrice={formatINR}
        onLoad={() => loadFn()}
        onSave={(data) => saveFn({ data })}
        onEstimateLandedCost={async (p, opts) =>
          estimateFn({
            data: {
              storeProductId: p.id,
              pincode: opts.pincode,
              logisticName: opts.logisticName,
              sellPriceInr: opts.sellPreview ?? p.salePrice,
            },
          })
        }
        ProfitPanel={CJImportProfitPanel}
        onToast={(msg, type) => (type === "error" ? toast.error(msg) : toast.success(msg))}
        Switch={Switch}
        Input={Input}
        Label={Label}
        Button={Button}
        cn={cn}
        icons={{ Save, Search, Zap, RefreshCw, CheckCircle2, AlertTriangle }}
      />
    </AdminShell>
  );
}
