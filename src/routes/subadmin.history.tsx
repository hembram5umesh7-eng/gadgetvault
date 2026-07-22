import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listMyProductPushes } from "@/lib/subadmin.functions";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { formatINR } from "@/lib/order-utils";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/subadmin/history")({ component: SubAdminHistory });

type PushRow = Awaited<ReturnType<typeof listMyProductPushes>>["pushes"][number];

function SubAdminHistory() {
  const load = useAuthedServerFn(listMyProductPushes);
  const [pushes, setPushes] = useState<PushRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const { pushes: rows } = await load();
      setPushes(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">My Product Pushes</h1>
          <p className="text-sm text-muted-foreground">Tumne jo products Dropship India se push kiye</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground bg-muted/40 border-b">
            <tr>
              <th className="text-left p-3">Product</th>
              <th className="text-left p-3">Shopify status</th>
              <th className="text-left p-3">Price</th>
              <th className="text-left p-3">Pushed</th>
              <th className="text-left p-3">Admin live</th>
            </tr>
          </thead>
          <tbody>
            {pushes.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3 font-semibold">{p.shopify_product_title}</td>
                <td className="p-3 text-muted-foreground">{p.shopify_product_status}</td>
                <td className="p-3">{p.shopify_price_inr != null ? formatINR(Number(p.shopify_price_inr)) : "—"}</td>
                <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleString("en-IN")}</td>
                <td className="p-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.admin_live ? "bg-green-500/15 text-green-700" : "bg-amber-500/15 text-amber-700"}`}>
                    {p.admin_live ? "Live on store" : "Waiting admin"}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && pushes.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">Abhi koi push register nahi hua.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
