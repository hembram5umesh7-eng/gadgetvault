import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { getReferralSettingsAdmin, saveReferralSettingsAdmin } from "@/lib/referral.functions";
import type { ReferralSettings } from "@/lib/referral-settings";
import { toast } from "sonner";
import { Save, Users, Gift } from "lucide-react";

export const Route = createFileRoute("/admin/referrals")({
  component: AdminReferralsPage,
});

function AdminReferralsPage() {
  const loadFn = useAuthedServerFn(getReferralSettingsAdmin);
  const saveFn = useAuthedServerFn(saveReferralSettingsAdmin);
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [stats, setStats] = useState({ totalReferrals: 0, totalCodes: 0 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await loadFn();
    setSettings(res.settings);
    setStats({ totalReferrals: res.totalReferrals, totalCodes: res.totalCodes });
  }, [loadFn]);

  useEffect(() => {
    load().catch((e) => toast.error(e instanceof Error ? e.message : "Load failed"));
  }, [load]);

  const save = async () => {
    if (!settings) return;
    setBusy(true);
    try {
      await saveFn({ data: settings });
      toast.success("Referral settings saved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (!settings) {
    return (
      <AdminShell title="Referrals" subtitle="Loading…">
        <p className="text-sm text-muted-foreground">Loading referral settings…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Referral Program"
      subtitle="Control discounts for friends who join + rewards for referrers. Grow GadgetVault fast."
      actions={
        <Button onClick={() => void save()} disabled={busy} className="gap-2 font-bold">
          <Save className="h-4 w-4" />
          {busy ? "Saving…" : "Save settings"}
        </Button>
      }
    >
      <div className="space-y-6 max-w-3xl">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4" /> Successful referrals
            </p>
            <p className="text-2xl font-extrabold mt-1">{stats.totalReferrals}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Gift className="h-4 w-4" /> Active referral codes
            </p>
            <p className="text-2xl font-extrabold mt-1">{stats.totalCodes}</p>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold">Program master switch</h2>
              <p className="text-xs text-muted-foreground mt-1">OFF = referral codes hidden, no discounts applied</p>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={(v) => setSettings({ ...settings, enabled: v })} />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h2 className="font-bold">Friend discount (referred user)</h2>
          <p className="text-xs text-muted-foreground">Discount on their first order when they use a referral code</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={settings.referredDiscountType}
                onChange={(e) =>
                  setSettings({ ...settings, referredDiscountType: e.target.value as "percent" | "fixed" })
                }
              >
                <option value="percent">Percent %</option>
                <option value="fixed">Fixed ₹</option>
              </select>
            </div>
            <div>
              <Label>Value</Label>
              <Input
                type="number"
                min={1}
                className="mt-1"
                value={settings.referredDiscountValue}
                onChange={(e) => setSettings({ ...settings, referredDiscountValue: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Max discount cap (₹)</Label>
              <Input
                type="number"
                min={0}
                className="mt-1"
                value={settings.maxReferredDiscount}
                onChange={(e) => setSettings({ ...settings, maxReferredDiscount: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Min order amount (₹)</Label>
              <Input
                type="number"
                min={0}
                className="mt-1"
                value={settings.minOrderAmount}
                onChange={(e) => setSettings({ ...settings, minOrderAmount: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h2 className="font-bold">Your reward (referrer)</h2>
          <p className="text-xs text-muted-foreground">Auto-generated coupon when friend completes first order</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Reward type</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={settings.referrerRewardType}
                onChange={(e) =>
                  setSettings({ ...settings, referrerRewardType: e.target.value as "percent" | "fixed" })
                }
              >
                <option value="percent">Percent % of friend's order</option>
                <option value="fixed">Fixed ₹</option>
              </select>
            </div>
            <div>
              <Label>Reward value</Label>
              <Input
                type="number"
                min={1}
                className="mt-1"
                value={settings.referrerRewardValue}
                onChange={(e) => setSettings({ ...settings, referrerRewardValue: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Max reward cap (₹)</Label>
              <Input
                type="number"
                min={0}
                className="mt-1"
                value={settings.maxReferrerReward}
                onChange={(e) => setSettings({ ...settings, maxReferrerReward: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Code prefix</Label>
              <Input
                className="mt-1 font-mono uppercase"
                maxLength={6}
                value={settings.codePrefix}
                onChange={(e) => setSettings({ ...settings, codePrefix: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
