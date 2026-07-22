import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { getFlashSaleAdmin, saveFlashSaleAdmin } from "@/lib/flash-sale.functions";
import { useCategories } from "@/lib/categories";
import { formatINR } from "@/lib/order-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Save, Search, Zap } from "lucide-react";
import { AdminFlashSalePanel } from "@flash-sale-template";

export const Route = createFileRoute("/admin/flash-sale")({
  component: AdminFlashSalePage,
});

function AdminFlashSalePage() {
  const loadFn = useAuthedServerFn(getFlashSaleAdmin);
  const saveFn = useAuthedServerFn(saveFlashSaleAdmin);
  const { categories } = useCategories();

  return (
    <AdminShell
      title="Flash Sale Control"
      subtitle="Shopify products — set flash sale prices synced to your storefront."
    >
      <AdminFlashSalePanel
        categories={categories}
        formatPrice={formatINR}
        onLoad={() => loadFn()}
        onSave={(data) => saveFn({ data })}
        onToast={(msg, type) => (type === "error" ? toast.error(msg) : toast.success(msg))}
        onConfirmLoss={(lossCount) =>
          window.confirm(
            `${lossCount} product(s) flash sale price par LOSS mein hain. Phir bhi save karna hai?`,
          )
        }
        Switch={Switch}
        Input={Input}
        Label={Label}
        Button={Button}
        cn={cn}
        icons={{ Save, Search, Zap, CheckCircle2, AlertTriangle }}
      />
    </AdminShell>
  );
}
