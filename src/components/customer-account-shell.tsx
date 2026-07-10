import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { UserRound, Package, MapPin, Heart, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/account", label: "Overview", icon: UserRound, exact: true },
  { to: "/orders", label: "My Orders", icon: Package, exact: false },
  { to: "/account", label: "Profile & Addresses", icon: MapPin, exact: true, hash: "profile" },
  { to: "/wishlist", label: "Wishlist", icon: Heart, exact: false },
] as const;

export function CustomerAccountShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { user, signOut } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        {user?.email && (
          <p className="text-xs text-muted-foreground mt-2">Signed in as <span className="font-medium">{user.email}</span></p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-56 shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {NAV.map((n) => (
              <Link
                key={n.label}
                to={n.to}
                hash={n.hash}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground whitespace-nowrap shrink-0"
                activeProps={{ className: "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary" }}
                activeOptions={{ exact: n.exact }}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
            <Button
              variant="ghost"
              className="justify-start text-destructive hover:text-destructive hover:bg-destructive/10 whitespace-nowrap"
              onClick={() => signOut().then(() => { window.location.href = "/"; })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </nav>
        </aside>

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
