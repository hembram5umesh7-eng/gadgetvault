import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { syncSupabaseSession } from "@/lib/auth-session";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { LayoutDashboard, Package, History, ArrowLeft, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", hint: "Overview", to: "/subadmin", icon: LayoutDashboard, exact: true as const },
  { label: "Dropship India", hint: "Push products", to: "/subadmin/dropship", icon: Upload, exact: false as const },
  { label: "My Pushes", hint: "History", to: "/subadmin/history", icon: History, exact: false as const },
] as const;

export const Route = createFileRoute("/subadmin")({ component: SubAdminLayout });

function SubAdminLayout() {
  const navigate = useNavigate();
  const { user, isSubAdmin, isAdmin, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user) navigate({ to: "/auth", search: { redirect: "/subadmin" } });
    else if (isAdmin) navigate({ to: "/admin" });
    else if (!isSubAdmin) navigate({ to: "/" });
  }, [ready, user, isSubAdmin, isAdmin, navigate]);

  useEffect(() => {
    if (ready && user && isSubAdmin) void syncSupabaseSession();
  }, [ready, user, isSubAdmin]);

  if (!ready || !user || !isSubAdmin || isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 container mx-auto px-4 py-6">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24 space-y-1">
              <p className="text-xs font-bold uppercase text-muted-foreground px-3 mb-1">Sub-Admin</p>
              <p className="text-[10px] text-muted-foreground px-3 mb-2">Sirf Dropship India product push</p>
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  activeProps={{ className: "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary" }}
                  activeOptions={{ exact: n.exact }}
                >
                  <n.icon className="h-4 w-4 shrink-0" />
                  <span className="flex flex-col leading-tight">
                    <span>{n.label}</span>
                    <span className="text-[10px] font-normal opacity-70">{n.hint}</span>
                  </span>
                </Link>
              ))}
              <Link to="/" className="flex items-center gap-2 px-3 py-2 mt-4 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Back to store
              </Link>
            </div>
          </aside>
          <main className="flex-1 min-w-0">
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn("shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold")}
                  activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}
                  activeOptions={{ exact: n.exact }}
                >
                  {n.label}
                </Link>
              ))}
            </div>
            <Outlet />
          </main>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
