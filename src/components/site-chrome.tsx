import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Cpu, LogOut, Menu, X, Mail, Phone, ShieldCheck, Truck,
  UserRound, Search, Heart, LayoutGrid, ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useCompare } from "@/lib/compare-context";
import { useCategories } from "@/lib/categories";
import { POLICY_LINKS, STORE, fullAddress, hasGstin, hasPhone } from "@/lib/store-info";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STORE_CATEGORIES = [
  { label: "Kitchen Accessories", slug: "kitchen-accessories" },
  { label: "Unique Gadgets", slug: "unique-gadgets" },
  { label: "Necessities", slug: "necessities" },
];

export function SiteHeader() {
  const { user, isAdmin, isStaff, isManufacturer, signOut } = useAuth();
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const { count: compareCount } = useCompare();
  const { categories } = useCategories();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");

  const navItems = categories.length
    ? categories.filter((c) => c.slug).slice(0, 3).map((c) => ({ label: c.name, slug: c.slug }))
    : STORE_CATEGORIES;

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate({ to: "/search", search: { q: q.trim() } });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-xl shadow-sm">
      <div className="bg-gradient-promo text-white text-xs font-medium text-center py-2 px-4 tracking-wide">
        Free shipping on orders ₹{STORE.freeShippingMin}+ · Secure Razorpay checkout · Pan-India delivery
      </div>

      <div className="container mx-auto flex h-[4.25rem] items-center gap-2 sm:gap-3 px-4">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
            <Cpu className="h-5 w-5 text-primary" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <span className="font-extrabold text-lg tracking-tight block">
              Gadget<span className="text-primary">Vault</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest hidden sm:block">
              Premium Tech
            </span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 flex-1 min-w-0 mx-1">
          {navItems.map((n) => (
            <Link key={n.slug} to="/category/$category" params={{ category: n.slug }}
              className="px-3 py-2 text-sm font-semibold text-foreground/80 hover:text-primary rounded-lg hover:bg-primary/5 transition-all whitespace-nowrap"
              activeProps={{ className: "text-primary bg-primary/10" }}>{n.label}</Link>
          ))}
        </nav>

        <form onSubmit={search} className="hidden md:flex flex-1 max-w-xs lg:max-w-sm shrink-0">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={2.5} />
            <Input
              placeholder="Search products…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-muted/60 border-transparent focus-visible:bg-background"
            />
          </div>
        </form>

        <div className="flex items-center gap-0.5 shrink-0 ml-auto md:ml-0">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl h-10 px-2.5 hover:bg-primary/10">
                  <UserRound className="h-5 w-5 text-foreground" strokeWidth={2.5} />
                  <span className="hidden sm:inline text-sm font-semibold">Account</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/account" })}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/orders" })}>My Orders</DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>Admin Dashboard</DropdownMenuItem>
                  </>
                )}
                {isStaff && !isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate({ to: "/staff" })}>Worker Portal</DropdownMenuItem>
                  </>
                )}
                {isManufacturer && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate({ to: "/partner" })}>Supplier Panel</DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut().then(() => navigate({ to: "/" }))} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl h-10 gap-1.5 px-2.5"
              onClick={() => navigate({ to: "/auth", search: { redirect: typeof window !== "undefined" ? window.location.pathname : "/" } })}
            >
              <UserRound className="h-5 w-5" strokeWidth={2.5} />
              <span className="hidden sm:inline font-semibold">Sign In</span>
            </Button>
          )}

          <Button variant="ghost" size="sm" className="relative rounded-xl h-10 w-10 p-0 hidden sm:flex hover:bg-primary/10" onClick={() => navigate({ to: "/wishlist" })} aria-label="Wishlist">
            <Heart className="h-5 w-5" strokeWidth={2.5} />
            {wishCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">{wishCount}</span>}
          </Button>
          <Button variant="ghost" size="sm" className="relative rounded-xl h-10 w-10 p-0 hidden sm:flex hover:bg-primary/10" onClick={() => navigate({ to: "/compare" })} aria-label="Compare">
            <LayoutGrid className="h-5 w-5" strokeWidth={2.5} />
            {compareCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">{compareCount}</span>}
          </Button>
          <Button variant="ghost" size="sm" className="relative rounded-xl h-10 gap-1.5 px-2.5 hover:bg-primary/10" onClick={() => navigate({ to: "/cart" })} aria-label="Cart">
            <ShoppingCart className={`h-5 w-5 ${count > 0 ? "text-primary" : ""}`} strokeWidth={2.5} />
            <span className="hidden md:inline text-sm font-semibold">Cart</span>
            {count > 0 && (
              <span className="absolute -top-1 right-0 md:static bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center ring-2 ring-background">
                {count}
              </span>
            )}
          </Button>

          <Button variant="ghost" size="sm" className="lg:hidden rounded-xl h-10 w-10 p-0" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t bg-background/95 backdrop-blur-xl">
          <form onSubmit={search} className="container mx-auto px-4 py-3 md:hidden">
            <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-xl" />
          </form>
          <nav className="container mx-auto flex flex-col px-4 pb-3">
            {navItems.map((n) => (
              <Link
                key={n.slug}
                to="/category/$category"
                params={{ category: n.slug }}
                onClick={() => setMobileOpen(false)}
                className="py-3 text-sm font-semibold border-b border-border/50 last:border-0"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { categories } = useCategories();
  const shopLinks = categories.length
    ? categories.filter((c) => c.slug).slice(0, 3).map((c) => ({ label: c.name, slug: c.slug }))
    : STORE_CATEGORIES;

  return (
    <footer className="border-t bg-gradient-to-b from-muted/20 to-muted/40 mt-auto">
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: ShieldCheck, title: "Secure Payments", desc: "Razorpay encrypted checkout" },
            { icon: Truck, title: "Delivery", desc: `Estimated ${STORE.deliveryDays} pan-India` },
            { icon: Cpu, title: "Listed Products", desc: "Details from supplier catalog" },
            { icon: Mail, title: "Support", desc: STORE.email },
          ].map((b) => (
            <div key={b.title} className="flex gap-3 items-start">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <b.icon className="h-5 w-5 text-primary" strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-bold text-sm">{b.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 grid gap-10 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="h-5 w-5 text-primary" strokeWidth={2.5} />
            <span className="font-extrabold text-lg">GadgetVault</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            {STORE.description}
          </p>
          <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> {STORE.email}</p>
            {hasPhone() && (
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {STORE.phone}</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-bold mb-4 text-sm uppercase tracking-wide">Shop</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {shopLinks.map((c) => (
              <li key={c.slug}>
                <Link to="/category/$category" params={{ category: c.slug }} className="hover:text-primary transition-colors">{c.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4 text-sm uppercase tracking-wide">Help</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><Link to="/orders" className="hover:text-primary transition-colors">Track Order</Link></li>
            <li><Link to="/shipping" className="hover:text-primary transition-colors">Shipping Info</Link></li>
            <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
            <li><Link to="/wishlist" className="hover:text-primary transition-colors">Wishlist</Link></li>
            <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
            <li><Link to="/refund" className="hover:text-primary transition-colors">Refund Policy</Link></li>
            <li><Link to="/auth" className="hover:text-primary transition-colors">Sign In</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4 text-sm uppercase tracking-wide">Legal</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {POLICY_LINKS.slice(0, 7).map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-primary transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border/50 py-5">
        <div className="container mx-auto px-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {STORE.legalName}. All rights reserved.
            {hasGstin() ? ` · GSTIN: ${STORE.gstin}` : ""}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {POLICY_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="hover:text-primary transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>
        {fullAddress() && (
          <p className="container mx-auto px-4 mt-2 text-[11px] text-muted-foreground/80">
            {fullAddress()}
          </p>
        )}
      </div>
    </footer>
  );
}
