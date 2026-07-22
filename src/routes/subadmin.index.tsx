import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getSubAdminDashboard } from "@/lib/subadmin.functions";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { Button } from "@/components/ui/button";
import { Package, Upload, Clock, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/subadmin/")({ component: SubAdminDashboard });

function SubAdminDashboard() {
  const { user } = useAuth();
  const load = useAuthedServerFn(getSubAdminDashboard);
  const [data, setData] = useState<Awaited<ReturnType<typeof getSubAdminDashboard>> | null>(null);

  useEffect(() => {
    load().then(setData).catch(() => setData(null));
  }, [load]);

  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Sub-Admin";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Hello, {name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sirf Dropship India se products push karo. Shopify password nahi chahiye — Sync server se hota hai.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Products pushed", value: data?.myPushCount ?? "—", icon: Package },
          { label: "Admin live pending", value: data?.pendingAdminLive ?? "—", icon: Clock },
          { label: "Quick action", value: "Push", icon: Upload, link: "/subadmin/dropship" as const },
        ].map((s) =>
          s.link ? (
            <Link key={s.label} to={s.link} className="bg-primary/10 border border-primary/20 rounded-xl p-5 hover:bg-primary/15 transition-colors">
              <s.icon className="h-5 w-5 text-primary mb-2" />
              <p className="text-xs uppercase font-bold text-muted-foreground">{s.label}</p>
              <p className="text-lg font-extrabold text-primary">Dropship India →</p>
            </Link>
          ) : (
            <div key={s.label} className="bg-card border rounded-xl p-5">
              <s.icon className="h-5 w-5 text-primary mb-2" />
              <p className="text-xs uppercase font-bold text-muted-foreground">{s.label}</p>
              <p className="text-3xl font-extrabold">{s.value}</p>
            </div>
          ),
        )}
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 text-sm">
        <p className="font-bold text-amber-900 dark:text-amber-200 mb-2">Tumhara kaam (3 steps)</p>
        <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
          <li><strong>Dropship India</strong> (dropshipindia.live) kholo → GadgetVault store → product push</li>
          <li>Wapas aa kar <Link to="/subadmin/dropship" className="text-primary font-semibold">Dropship India page</Link> par product <strong>Register</strong> karo</li>
          <li>Admin Shopify mein product ko <strong>Live</strong> karega — tumhe notify nahi, status yahan dikhega</li>
        </ol>
      </div>

      {data?.dropshipIndiaUrl && (
        <Button asChild size="lg" className="font-bold mb-8">
          <a href={data.dropshipIndiaUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" /> Open Dropship India
          </a>
        </Button>
      )}

      <section className="bg-card border rounded-xl p-5">
        <h2 className="font-bold mb-3">Recent pushes</h2>
        <div className="space-y-2">
          {(data?.recentPushes ?? []).map((p) => (
            <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
              <span className="font-semibold truncate pr-2">{p.shopify_product_title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${p.admin_live ? "bg-green-500/15 text-green-700" : "bg-amber-500/15 text-amber-700"}`}>
                {p.admin_live ? "Admin live" : "Pending live"}
              </span>
            </div>
          ))}
          {!data?.recentPushes?.length && (
            <p className="text-muted-foreground text-sm py-4">Abhi koi product push nahi. Dropship India se start karo.</p>
          )}
        </div>
        <Link to="/subadmin/history" className="text-sm text-primary font-semibold mt-3 inline-block">View all →</Link>
      </section>
    </div>
  );
}
