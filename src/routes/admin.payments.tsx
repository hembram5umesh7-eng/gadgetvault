import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { getPaymentGatewayStatus, saveRazorpayKeys } from "@/lib/payment-setup.functions";
import { toast } from "sonner";
import { CheckCircle2, Copy, CreditCard, ExternalLink, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/payments")({ component: AdminPaymentsPage });

type Status = Awaited<ReturnType<typeof getPaymentGatewayStatus>>;

function AdminPaymentsPage() {
  const loadStatus = useAuthedServerFn(getPaymentGatewayStatus);
  const saveKeys = useAuthedServerFn(saveRazorpayKeys);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setStatus(await loadStatus());
    } catch {
      toast.error("Could not load payment status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSave = async () => {
    if (!keyId.trim() || !keySecret.trim()) {
      toast.error("Key ID aur Key Secret dono paste karo");
      return;
    }
    setSaving(true);
    try {
      const res = await saveKeys({ data: { keyId: keyId.trim(), keySecret: keySecret.trim() } });
      toast.success(res.message);
      setKeyId("");
      setKeySecret("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const copyUrls = async () => {
    if (!status?.checkoutUrls.length) return;
    await navigator.clipboard.writeText(status.checkoutUrls.join("\n"));
    toast.success("Razorpay KYC URLs copy ho gayi");
  };

  return (
    <AdminShell
      title="Payment Gateway"
      subtitle="Razorpay — UPI, cards, netbanking for online checkout"
      actions={
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          Refresh
        </Button>
      }
    >
      <div className="space-y-6 max-w-2xl">
        <section className="bg-card border rounded-xl p-5">
          <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Status</p>
          <p className="text-lg font-extrabold flex items-center gap-2">
            {status?.razorpayConfigured ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" /> Razorpay connected
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-amber-600" /> Setup needed
              </>
            )}
          </p>
          {status?.keyIdPreview && (
            <p className="text-sm text-muted-foreground mt-1">
              Key: <code>{status.keyIdPreview}</code> · source: {status.source}
            </p>
          )}
        </section>

        <section className="bg-card border rounded-xl p-5 space-y-4">
          <h2 className="font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Razorpay API keys
          </h2>
          <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
            <li>
              <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noreferrer" className="text-primary font-medium">
                Razorpay Dashboard → API Keys
              </a>{" "}
              (Test mode se start karo)
            </li>
            <li>Generate Key Pair → Key ID (<code>rzp_test_...</code>) + Secret copy karo</li>
            <li>Neeche paste karo → Save & Test</li>
          </ol>
          <Input
            placeholder="rzp_test_xxxxxxxx"
            value={keyId}
            onChange={(e) => setKeyId(e.target.value)}
            className="font-mono text-sm"
          />
          <Input
            type="password"
            placeholder="Key secret"
            value={keySecret}
            onChange={(e) => setKeySecret(e.target.value)}
            className="font-mono text-sm"
          />
          <Button onClick={handleSave} disabled={saving} className="font-bold">
            {saving ? "Testing…" : "Save & Test Razorpay"}
          </Button>
        </section>

        <section className="bg-muted/30 border rounded-xl p-5 space-y-3">
          <h2 className="font-bold">Razorpay Webhook (auto refund)</h2>
          <p className="text-sm text-muted-foreground">
            Approval ke baad Razorpay Dashboard → Webhooks → Add URL:
          </p>
          <p className="text-xs font-mono bg-muted/40 p-3 rounded-lg break-all">
            {status?.webhookUrl ?? "https://gadgetvault.in/api/webhooks/razorpay"}
          </p>
          <p className="text-xs text-muted-foreground">
            Events: <code>payment.captured</code>, <code>refund.processed</code>, <code>refund.failed</code>
            · Secret ko <code>RAZORPAY_WEBHOOK_SECRET</code> mein save karo (Admin ya .env)
          </p>
        </section>

        <section className="bg-muted/30 border rounded-xl p-5 space-y-3">
          <h2 className="font-bold">Razorpay KYC — website URLs</h2>
          <p className="text-sm text-muted-foreground">
            Razorpay account activate karte waqt ye URLs submit karo:
          </p>
          <ul className="text-xs font-mono space-y-1 bg-muted/40 p-3 rounded-lg">
            {status?.checkoutUrls.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyUrls}>
              <Copy className="h-4 w-4 mr-1" /> Copy all URLs
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://dashboard.razorpay.com/app/account" target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" /> Razorpay Account
              </a>
            </Button>
          </div>
        </section>

        <section className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 text-sm">
          <p className="font-semibold text-green-800 dark:text-green-300">Shopify orders (COD)</p>
          <p className="text-muted-foreground mt-1">
            COD orders Shopify mein <strong>Payment pending</strong> dikhenge — ye normal hai. Delivery ke baad payment collect karo.
            Online Razorpay payment ke baad order auto-sync hoga as paid.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
