import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getDropshipIndiaUrls,
  listShopifyProductsForSubAdmin,
  registerProductPush,
  type ShopifyProductRow,
} from "@/lib/subadmin.functions";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { toast } from "sonner";
import { ExternalLink, RefreshCw, CheckCircle2, Package, ShieldCheck, UserRound, Lock } from "lucide-react";
import { formatINR } from "@/lib/order-utils";

export const Route = createFileRoute("/subadmin/dropship")({ component: SubAdminDropship });

function SubAdminDropship() {
  const loadProducts = useAuthedServerFn(listShopifyProductsForSubAdmin);
  const loadUrls = useAuthedServerFn(getDropshipIndiaUrls);
  const register = useAuthedServerFn(registerProductPush);

  const [products, setProducts] = useState<ShopifyProductRow[]>([]);
  const [dropshipUrl, setDropshipUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const [p, u] = await Promise.all([loadProducts(), loadUrls()]);
      setProducts(p.products);
      setDropshipUrl(u.dropshipIndiaPortal);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleRegister = async (p: ShopifyProductRow) => {
    if (p.alreadyClaimed && !p.claimedByMe) {
      toast.error("Ye product kisi aur ne register kiya hai");
      return;
    }
    setRegistering(p.id);
    try {
      const res = await register({
        data: {
          shopifyProductId: p.id,
          title: p.title,
          handle: p.handle,
          status: p.status,
          imageUrl: p.imageUrl ?? undefined,
          priceInr: p.priceInr ?? undefined,
        },
      });
      toast.success(res.message);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Register failed");
    } finally {
      setRegistering(null);
    }
  };

  const filtered = products.filter((p) =>
    !search.trim() || p.title.toLowerCase().includes(search.toLowerCase()) || p.handle.includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex flex-wrap justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">Dropship India Push</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Shopify password ki zarurat nahi — sirf Dropship India login + yahan register
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Sync products
          </Button>
          {dropshipUrl && (
            <Button size="sm" asChild>
              <a href={dropshipUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" /> Open Dropship India
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4 text-sm flex gap-3">
        <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-green-800 dark:text-green-200">Shopify login tumhe nahi dena padega</p>
          <p className="text-muted-foreground mt-1">
            <strong>Sync products</strong> button admin ke store se products laata hai (server token).
            Push ke liye <strong>dropshipindia.live</strong> kholo — wahan apna Dropship India account use karo
            (admin tumhe invite karega). Browser cookies share nahi hote — har sub-admin ka apna Dropship India login safe hai.
          </p>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 text-sm space-y-2">
        <p className="font-bold">Workflow</p>
        <p className="text-muted-foreground">
          1) <strong>Open Dropship India</strong> → GadgetVault store select → product push karo<br />
          2) Wapas yahan <strong>Sync products</strong> dabao — naye products dikhenge<br />
          3) Apne push par <strong>Register my push</strong> dabao<br />
          4) Admin Shopify mein product <strong>Live</strong> karega
        </p>
      </div>

      <Input
        placeholder="Search product name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md mb-4"
      />

      <div className="space-y-3">
        {filtered.map((p) => (
          <div key={p.id} className="bg-card border rounded-xl p-4 flex flex-wrap gap-4 items-center">
            <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden shrink-0">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{p.title}</p>
              <p className="text-xs text-muted-foreground">
                {p.status} · {p.priceInr != null ? formatINR(p.priceInr) : "—"} · {new Date(p.createdAt).toLocaleDateString("en-IN")}
              </p>
              {p.alreadyClaimed && p.pushedByName && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {p.claimedByMe ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" /> Aapne push kiya
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300">
                      <Lock className="h-3 w-3" /> {p.pushedByName} ne push kiya
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <UserRound className="h-3 w-3" />
                    {p.pushedByName}
                    {p.pushedByEmail && p.pushedByEmail !== "—" ? ` · ${p.pushedByEmail}` : ""}
                  </span>
                  {p.pushedAt && (
                    <span className="text-[11px] text-muted-foreground">
                      · {new Date(p.pushedAt).toLocaleDateString("en-IN")}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {p.claimedByMe && (
                <span className="text-xs font-bold text-green-600 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Registered
                </span>
              )}
              {p.alreadyClaimed && !p.claimedByMe && (
                <span className="text-xs font-semibold text-muted-foreground shrink-0 max-w-[140px] text-right leading-tight">
                  Duplicate nahi — sirf {p.pushedByName ?? "dusre sub-admin"} ke paas
                </span>
              )}
              {!p.alreadyClaimed && (
                <Button
                  size="sm"
                  disabled={registering === p.id}
                  onClick={() => handleRegister(p)}
                >
                  {registering === p.id ? "Saving…" : "Register my push"}
                </Button>
              )}
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">
            Koi product nahi mila. Pehle Dropship India se push karo, phir Sync dabao.
          </p>
        )}
      </div>
    </div>
  );
}
