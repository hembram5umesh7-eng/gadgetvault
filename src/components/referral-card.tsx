import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { getMyReferralInfo } from "@/lib/referral.functions";
import { formatINR } from "@/lib/order-utils";
import { toast } from "sonner";
import { Gift, Copy, Users, Share2 } from "lucide-react";

export function ReferralCard() {
  const loadFn = useAuthedServerFn(getMyReferralInfo);
  const [code, setCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [rewards, setRewards] = useState<{ referrer_reward_coupon_code: string | null; referred_discount: number }[]>([]);
  const [settings, setSettings] = useState<{ referredDiscountValue: number; referredDiscountType: string; referrerRewardValue: number; referrerRewardType: string; enabled: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFn()
      .then((res) => {
        setCode(res.code);
        setReferralCount(res.referralCount);
        setRewards(res.rewards);
        setSettings(res.settings);
      })
      .catch(() => toast.error("Could not load referral info"))
      .finally(() => setLoading(false));
  }, [loadFn]);

  const shareLink =
    typeof window !== "undefined" && code
      ? `${window.location.origin}/auth?tab=signup&ref=${code}`
      : "";

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Referral code copied!");
    } catch {
      toast.error("Could not copy");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Invite link copied!");
    } catch {
      toast.error("Could not copy");
    }
  };

  const shareInvite = async () => {
    const text = `Join GadgetVault with my code ${code} and get a discount on your first order!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "GadgetVault Invite", text, url: shareLink });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    await copyLink();
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading referral program…</p>;
  }

  if (!settings?.enabled) {
    return (
      <div className="rounded-xl border bg-muted/30 p-5 text-sm text-muted-foreground">
        Referral program is currently paused. Check back soon!
      </div>
    );
  }

  const friendDiscount =
    settings.referredDiscountType === "percent"
      ? `${settings.referredDiscountValue}% off`
      : formatINR(settings.referredDiscountValue);

  const yourReward =
    settings.referrerRewardType === "percent"
      ? `${settings.referrerRewardValue}% coupon`
      : formatINR(settings.referrerRewardValue);

  return (
    <section className="bg-card border rounded-xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
          <Gift className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-bold text-lg">Refer & Earn</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Invite friends & family — they get <strong className="text-foreground">{friendDiscount}</strong> on first order,
            you earn <strong className="text-foreground">{yourReward}</strong> coupon when they shop.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
        <Users className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-semibold">{referralCount} friend{referralCount !== 1 ? "s" : ""} joined via your code</span>
      </div>

      <div>
        <p className="text-xs font-bold uppercase text-muted-foreground mb-1.5">Your referral code</p>
        <div className="flex gap-2">
          <Input value={code} readOnly className="font-mono font-bold tracking-wider" />
          <Button variant="outline" onClick={() => void copyCode()} className="shrink-0">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void shareInvite()} className="font-bold gap-2">
          <Share2 className="h-4 w-4" /> Share invite link
        </Button>
        <Button variant="outline" onClick={() => void copyLink()} className="font-semibold">
          Copy link
        </Button>
      </div>

      {rewards.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Your reward coupons</p>
          <div className="space-y-2">
            {rewards.map((r, i) =>
              r.referrer_reward_coupon_code ? (
                <div key={i} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-sm">
                  <span className="font-mono font-bold">{r.referrer_reward_coupon_code}</span>
                  <span className="text-muted-foreground text-xs">Use at checkout</span>
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}
    </section>
  );
}
