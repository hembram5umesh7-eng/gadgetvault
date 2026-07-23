import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import {
  getShopifySetupStatus,
  saveShopifyClientSecret,
  saveShopifyAdminToken,
  runFullShopifySync,
  openShopifyPageInBrave,
  disconnectShopifyAdminToken,
} from "@/lib/shopify-setup.functions";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ExternalLink, RefreshCw, Unplug, Link2, Copy } from "lucide-react";
import { ShopifyBraveButton } from "@/components/shopify-brave-button";
import { appPublicOrigin } from "@/lib/site-url";
import { SHOPIFY_CANONICAL_ORIGIN } from "@/lib/shopify-oauth-config";
import { getStoreCategories } from "@/lib/category.functions";
import type { StoreCategory } from "@/lib/shopify-categories";
import { shopifyStoreDomain } from "@/integrations/shopify/config";

const SHOPIFY_CONNECT_URL = `${SHOPIFY_CANONICAL_ORIGIN}/api/shopify/auth`;

export const Route = createFileRoute("/admin/shopify")({
  component: AdminShopifyPage,
  validateSearch: (s: Record<string, unknown>) => ({
    connected: s.connected === "1" || s.connected === 1,
    ordersScopes: s.orders_scopes === "0" ? false : true,
    error: typeof s.error === "string" ? s.error : undefined,
  }),
});

type Status = Awaited<ReturnType<typeof getShopifySetupStatus>>;

function AdminShopifyPage() {
  const { connected, ordersScopes, error } = useSearch({ from: "/admin/shopify" });
  const loadStatus = useAuthedServerFn(getShopifySetupStatus);
  const saveSecret = useAuthedServerFn(saveShopifyClientSecret);
  const saveToken = useAuthedServerFn(saveShopifyAdminToken);
  const fullSync = useAuthedServerFn(runFullShopifySync);
  const openBrave = useAuthedServerFn(openShopifyPageInBrave);
  const disconnect = useAuthedServerFn(disconnectShopifyAdminToken);

  const [status, setStatus] = useState<Status | null>(null);
  const [secretInput, setSecretInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [collections, setCollections] = useState<StoreCategory[]>([]);

  const shopifyAdminUrl = `https://${shopifyStoreDomain() || "gharstoreessential.myshopify.com"}/admin`;

  const refresh = async () => {
    setLoading(true);
    try {
      setStatus(await loadStatus());
      try {
        setCollections(await getStoreCategories());
      } catch {
        setCollections([]);
      }
    } catch {
      toast.error("Could not load Shopify status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (error) toast.error(decodeURIComponent(error), { duration: 12000 });
  }, [error]);

  useEffect(() => {
    if (ordersScopes === false) {
      toast.warning(
        "Connected lekin read_orders + write_orders scopes missing. Dev Dashboard → Versions mein add karo → Release → Connect Shopify dubara.",
        { duration: 15000 },
      );
    }
  }, [ordersScopes]);

  useEffect(() => {
    if (!connected) return;
    toast.success("Shopify connected!");
    (async () => {
      setSyncing(true);
      try {
        const res = await fullSync();
        if (res.ok) toast.success(res.message);
        else toast.warning(res.message, { duration: 12000 });
        await refresh();
      } finally {
        setSyncing(false);
      }
    })();
  }, [connected]);

  const handleSaveSecret = async () => {
    if (!secretInput.trim()) return toast.error("Client secret paste karo (shpss_...)");
    try {
      const res = await saveSecret({ data: { secret: secretInput.trim() } });
      toast.success(res.message);
      setSecretInput("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) return toast.error("Admin API token paste karo (shpat_...)");
    try {
      const res = await saveToken({ data: { token: tokenInput.trim() } });
      if (res.scopesReady) toast.success(res.message);
      else toast.warning(res.message, { duration: 12000 });
      setTokenInput("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const openInBrave = async (targetUrl: string) => {
    try {
      const res = await openBrave({ data: { url: targetUrl } });
      if (res.ok) toast.success("Brave mein khola (Shopify login ready)");
      else window.open(targetUrl, "_blank", "noopener,noreferrer");
    } catch {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopyCustomerUrls = async () => {
    const s = status?.customerApiSetup;
    if (!s) return;
    const text = [
      "Callback URI:",
      s.callbackUri,
      "",
      "Javascript origin:",
      s.javascriptOrigin,
      "",
      "Logout URI:",
      s.logoutUri,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("3 URLs copy ho gayi!");
    await openInBrave(status?.shopifyHeadlessCustomerApiUrl ?? "");
  };
  const handleFullSync = async () => {
    setSyncing(true);
    try {
      const res = await fullSync();
      if (res.ok) toast.success(res.message);
      else toast.error(res.message, { duration: 12000 });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed", { duration: 12000 });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AdminShell
      title="Shopify Connect"
      subtitle="Client ID + Secret save ho chuke hain. Ab scopes configure karke connect karo."
      actions={
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      }
    >
      {loading && !status ? (
        <p className="text-muted-foreground py-12 text-center">Loading…</p>
      ) : (
        <div className="space-y-6 max-w-3xl">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-card border rounded-xl p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">Connection</p>
              <p className="text-lg font-extrabold mt-1 flex items-center gap-2">
                {status?.scopesReady ? (
                  <><CheckCircle2 className="h-5 w-5 text-green-600" /> Connected</>
                ) : (
                  <><XCircle className="h-5 w-5 text-amber-600" /> Setup needed</>
                )}
              </p>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">Products live</p>
              <p className="text-lg font-extrabold mt-1">{status?.storefrontProductCount ?? 0}</p>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">Orders pending</p>
              <p className="text-lg font-extrabold mt-1">{status?.pendingShopifyOrders ?? 0}</p>
            </div>
          </div>

          {status && !status.ordersScopeReady && (
            <section className="bg-red-500/10 border-2 border-red-500/40 rounded-xl p-5 space-y-2">
              <h2 className="font-bold text-red-800 dark:text-red-300">Order cancel sync — scopes missing</h2>
              <p className="text-sm text-muted-foreground">
                User cancel kare toh Shopify par order open rehta hai jab tak <strong>read_orders</strong> +{" "}
                <strong>write_orders</strong> install na hon.
              </p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>
                  <a href={status.shopifyDevVersionsUrl} target="_blank" rel="noreferrer" className="text-primary font-semibold">
                    Dev Dashboard → Versions
                  </a>{" "}
                  → read_orders, write_orders select karo → Release
                </li>
                <li>Neeche <strong>Connect Shopify</strong> dubara dabao (Allow permissions)</li>
                <li>Admin → Orders → Refresh — purane cancelled orders Shopify par push ho jayenge</li>
              </ol>
            </section>
          )}

          <section className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 space-y-2">
            <h2 className="font-bold text-green-800 dark:text-green-300">✓ Credentials saved</h2>
            <p className="text-sm text-muted-foreground">
              Client ID: <code className="text-xs">{status?.clientId || "daf27f08…"}</code>
              {status?.hasClientSecret ? " · Client secret: saved in database" : " · Client secret: missing"}
            </p>
          </section>

          {status?.customerApiSetup && (
            <section className="bg-green-500/5 border-2 border-green-500/30 rounded-xl p-5 space-y-4">
              <h2 className="font-bold text-lg text-green-800 dark:text-green-300 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" /> Customer API URLs — saved ✓
              </h2>
              <p className="text-sm text-muted-foreground">
                Shopify login ab Supabase account se link hota hai.                 Test:{" "}
                <a href={`${appPublicOrigin()}/auth`} className="text-primary font-medium" target="_blank" rel="noreferrer">
                  Sign in with Shopify account
                </a>
              </p>
              <div className="grid gap-2 text-xs font-mono bg-muted/40 p-3 rounded-lg">
                <p><span className="text-muted-foreground">Callback:</span> {status.customerApiSetup.callbackUri}</p>
                <p><span className="text-muted-foreground">Origin:</span> {status.customerApiSetup.javascriptOrigin}</p>
                <p><span className="text-muted-foreground">Logout:</span> {status.customerApiSetup.logoutUri}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ShopifyBraveButton
                  size="lg"
                  variant="outline"
                  url={status.shopifyHeadlessCustomerApiUrl}
                  onOpen={openInBrave}
                >
                  <ExternalLink className="h-4 w-4 mr-1" /> Open Customer API (Brave)
                </ShopifyBraveButton>
                <Button size="lg" variant="ghost" onClick={handleCopyCustomerUrls}>
                  <Copy className="h-4 w-4 mr-1" /> Copy URLs again
                </Button>
              </div>
            </section>
          )}

          {!status?.scopesReady && status?.needsOAuthInstall && (
            <section className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-5 space-y-3">
              <h2 className="font-bold text-amber-900 dark:text-amber-200">⚠ Last step — OAuth install (1 click)</h2>
              <p className="text-sm text-muted-foreground">
                Scopes version mein add ho chuke (<strong>gadgetvault-2 active</strong>), lekin store par abhi grant nahi hue.
                Screenshot mein <strong>Redirect URLs khali</strong> thi — isliye Connect fail ho sakta hai.
              </p>
              <div className="rounded-lg bg-muted/50 p-3 font-mono text-xs break-all space-y-1">
                <p><span className="text-muted-foreground">Application URL:</span> {appPublicOrigin()}/admin/shopify</p>
                <p><span className="text-muted-foreground">Redirect URL:</span> {status.oauthRedirectUrl}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Dev Dashboard → Versions → dono URLs <strong>exact</strong> paste karo (host = gadgetvault.in) → Release → Connect dabao.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="lg" className="font-bold">
                  <a href={SHOPIFY_CONNECT_URL}>
                    <Link2 className="h-4 w-4 mr-1" /> Connect Shopify
                  </a>
                </Button>
                <ShopifyBraveButton variant="outline" size="sm" url={status?.shopifyDevVersionsUrl ?? ""} onOpen={openInBrave}>
                  <ExternalLink className="h-4 w-4 mr-1" /> Open Versions
                </ShopifyBraveButton>
              </div>
            </section>
          )}

          {!status?.scopesReady && !status?.needsOAuthInstall && (
            <section className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-5 space-y-3">
              <h2 className="font-bold text-amber-900 dark:text-amber-200">⚠ Scopes configure karo (1 baar)</h2>
              <p className="text-sm text-muted-foreground">
                Abhi token mil raha hai lekin <strong>scopes empty</strong> hain — isliye products/orders sync nahi ho raha.
              </p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Dev Dashboard → GadgetVault → <strong>Versions</strong> → Create version</li>
                <li>Admin API scopes select karo: read/write products, publications, draft orders</li>
                <li>Release karo, phir store par app install karo</li>
                <li>Neeche <strong>Connect Shopify</strong> dabao YA Admin API token paste karo</li>
              </ol>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={status?.shopifyDevVersionsUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" /> Open Versions (scopes)
                  </a>
                </Button>
                <ShopifyBraveButton variant="outline" size="sm" url={status?.shopifyDevDashboardUrl ?? ""} onOpen={openInBrave}>
                  <ExternalLink className="h-4 w-4 mr-1" /> App Settings
                </ShopifyBraveButton>
              </div>
              {status?.connectError && (
                <p className="text-xs text-amber-800 dark:text-amber-300">{status.connectError}</p>
              )}
            </section>
          )}

          <section className="bg-card border rounded-xl p-5 space-y-3">
            <h2 className="font-bold">Option A — Connect Shopify (recommended)</h2>
            <p className="text-sm text-muted-foreground">
              Scopes configure hone ke baad ye button dabao — Shopify permission screen → Allow → auto sync.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="font-bold" disabled={!status?.hasClientSecret}>
                <a href="/api/shopify/auth">
                  <Link2 className="h-4 w-4 mr-1" /> Connect Shopify
                </a>
              </Button>
              <Button
                onClick={handleFullSync}
                disabled={syncing || !status?.scopesReady}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Sync Everything"}
              </Button>
              {status?.hasToken && (
                <Button variant="ghost" onClick={() => disconnect().then(refresh)}>
                  <Unplug className="h-4 w-4 mr-1" /> Disconnect
                </Button>
              )}
            </div>
          </section>

          <section id="collections" className="bg-card border rounded-xl p-5 space-y-4 scroll-mt-24">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold">Shopify Collections → Site Nav</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Categories sirf <strong>Shopify Admin</strong> se manage karo. Naya collection banao → products assign karo → yahan aur website nav mein auto dikhega.
                  GadgetVault mein alag category banane ki zarurat nahi.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href={`${shopifyAdminUrl}/collections`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" /> Shopify Collections
                </a>
              </Button>
            </div>
            {collections.length === 0 ? (
              <p className="text-sm text-muted-foreground">Koi collection nahi mila — Shopify mein collection banao aur Sync Everything dabao.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="p-2">Collection</th>
                      <th className="p-2">Handle</th>
                      <th className="p-2">Products</th>
                      <th className="p-2">Site link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collections.map((c) => (
                      <tr key={c.id} className="border-b border-border/50">
                        <td className="p-2 font-semibold">{c.name}</td>
                        <td className="p-2 font-mono text-xs">{c.slug}</td>
                        <td className="p-2">{c.productCount > 0 ? c.productCount + "+" : "—"}</td>
                        <td className="p-2">
                          <Link to="/category/$category" params={{ category: c.slug }} className="text-primary font-semibold hover:underline">
                            View on site →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="bg-card border rounded-xl p-5 space-y-3">
            <h2 className="font-bold">Option B — Admin API token paste karo</h2>
            <p className="text-sm text-muted-foreground">
              Shopify Admin → Settings → Apps → Develop apps → apni app → Configure Admin API scopes → Install → Reveal token (<code>shpat_...</code>)
            </p>
            <Input
              type="password"
              placeholder="shpat_xxxxxxxx"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="font-mono text-sm"
            />
            <Button onClick={handleSaveToken}>Save Admin Token</Button>
          </section>

          <section className="bg-card border rounded-xl p-5 space-y-3">
            <h2 className="font-bold">Update Client Secret (optional)</h2>
            <p className="text-sm text-muted-foreground">
              Dev Dashboard → Settings → Client secret (starts with <code>shpss_</code>)
            </p>
            <Input
              type="password"
              placeholder="shpss_xxxxxxxx"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              className="font-mono text-sm"
            />
            <Button onClick={handleSaveSecret} variant="outline">Save Client Secret</Button>
          </section>

          <section className="bg-muted/20 border rounded-xl p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">App Automation Token</p>
            <p>
              <code className="text-xs">atkn_...</code> token save hai — ye sirf app deploy ke liye hai, store API ke liye nahi.
            </p>
          </section>

          <ShopifyBraveButton variant="outline" size="sm" url={status?.shopifyAppSettingsUrl ?? ""} onOpen={openInBrave}>
            <ExternalLink className="h-4 w-4 mr-1" /> Open Shopify Admin → Develop apps
          </ShopifyBraveButton>

          {status && (
            <section className="bg-muted/30 border rounded-xl p-4">
              <p className="text-xs font-bold uppercase mb-2">API Scopes</p>
              <div className="flex flex-wrap gap-2">
                {status.requiredScopes.map((s) => {
                  const check = status.scopes.find((c) => c.name === s);
                  return (
                    <span key={s} className={`text-xs px-2 py-1 rounded-full border ${check?.ok ? "bg-green-500/10 border-green-500/30" : "bg-muted"}`}>
                      {check?.ok ? "✓" : "○"} {s}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          <p className="text-xs text-muted-foreground">
            <Link to="/admin" className="text-primary font-semibold">← Dashboard</Link>
          </p>
        </div>
      )}
    </AdminShell>
  );
}
