import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Cpu, ShoppingBag, User, SearchNormal1, Logout, HambergerMenu, CloseCircle,
  Sms, Call, ShieldTick, Truck, Heart, Element3,
} from "iconsax-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useCompare } from "@/lib/compare-context";
import { useCategories } from "@/lib/categories";
import { POLICY_LINKS, STORE, fullAddress } from "@/lib/store-info";
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

const FALLBACK_NAV = [
  { label: "Audio", slug: "audio" },
  { label: "Chargers", slug: "chargers" },
  { label: "Smartwatches", slug: "smartwatches" },
  { label: "Accessories", slug: "accessories" },
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
    ? categories.slice(0, 5).map((c) => ({ label: c.name, slug: c.slug }))
    : FALLBACK_NAV;

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate({ to: "/search", search: { q: q.trim() } });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="bg-gradient-promo text-white text-xs font-medium text-center py-2 px-4 tracking-wide">
        Free shipping ₹{STORE.freeShippingMin}+ · Secure Razorpay payments · 100% Genuine products
      </div>

      <div className="container mx-auto flex h-[4.25rem] items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
            <Cpu size={22} className="text-primary" variant="Bold" />
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

        <nav className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0 mx-2">
          {navItems.map((n) => (
            <Link key={n.slug} to="/category/$category" params={{ category: n.slug }}
              className="px-3.5 py-2 text-sm font-semibold text-foreground/75 hover:text-primary rounded-lg hover:bg-primary/5 transition-all"
              activeProps={{ className: "text-primary bg-primary/5" }}>{n.label}</Link>
          ))}
          <Link to="/deals" className="px-3.5 py-2 text-sm font-bold text-primary rounded-lg hover:bg-primary/5">Deals</Link>
        </nav>

        <form onSubmit={search} className="hidden md:flex w-full max-w-xs lg:max-w-sm shrink-0 md:ml-auto lg:ml-0">
          <div className="relative w-full">
            <SearchNormal1 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search gadgets, brands…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-muted/60 border-transparent focus-visible:bg-background focus-visible:ring-primary/20"
            />
          </div>
        </form>

        <div className="flex items-center gap-0.5 shrink-0">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-xl h-10">
                  <User size={20} />
                  <span className="hidden sm:inline text-sm font-medium">Account</span>
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
                  <Logout size={16} className="mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl h-10"
              onClick={() => navigate({ to: "/auth", search: { redirect: typeof window !== "undefined" ? window.location.pathname : "/" } })}
            >
              <User size={20} className="sm:mr-2" />
              <span className="hidden sm:inline font-medium">Sign In</span>
            </Button>
          )}

          <Button variant="ghost" size="sm" className="relative rounded-xl h-10 w-10 p-0 hidden sm:flex" onClick={() => navigate({ to: "/wishlist" })}>
            <Heart size={20} />
            {wishCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">{wishCount}</span>}
          </Button>
          <Button variant="ghost" size="sm" className="relative rounded-xl h-10 w-10 p-0 hidden sm:flex" onClick={() => navigate({ to: "/compare" })}>
            <Element3 size={20} />
            {compareCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">{compareCount}</span>}
          </Button>
          <Button variant="ghost" size="sm" className="relative rounded-xl h-10 w-10 p-0" onClick={() => navigate({ to: "/cart" })}>
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center shadow-sm">
                {count}
              </span>
            )}
          </Button>

          <Button variant="ghost" size="sm" className="lg:hidden rounded-xl h-10 w-10 p-0" onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? <CloseCircle size={20} /> : <HambergerMenu size={20} />}
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
    ? categories.map((c) => ({ label: c.name, slug: c.slug }))
    : FALLBACK_NAV;

  return (
    <footer className="border-t bg-gradient-to-b from-muted/20 to-muted/40 mt-auto">
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: ShieldTick, title: "Secure Payments", desc: "Razorpay encrypted checkout" },
            { icon: Truck, title: "Fast Delivery", desc: `Pan-India ${STORE.deliveryDays}` },
            { icon: Cpu, title: "Genuine Products", desc: "Verified suppliers only" },
            { icon: Call, title: "24/7 Support", desc: STORE.phone },
          ].map((b) => (
            <div key={b.title} className="flex gap-3 items-start">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <b.icon size={20} className="text-primary" variant="Bold" />
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
            <Cpu size={22} className="text-primary" variant="Bold" />
            <span className="font-extrabold text-lg">GadgetVault</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            {STORE.description}
          </p>
          <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><Sms size={16} className="text-primary" /> {STORE.email}</p>
            <p className="flex items-center gap-2"><Call size={16} className="text-primary" /> {STORE.phone}</p>
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
            <li><Link to="/deals" className="hover:text-primary transition-colors">Deals & Offers</Link></li>
            <li><Link to="/wishlist" className="hover:text-primary transition-colors">Wishlist</Link></li>
            <li><Link to="/compare" className="hover:text-primary transition-colors">Compare</Link></li>
            <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
            <li><Link to="/warranty" className="hover:text-primary transition-colors">Warranty</Link></li>
            <li><Link to="/refund" className="hover:text-primary transition-colors">Refund Policy</Link></li>
            <li><Link to="/auth" className="hover:text-primary transition-colors">Sign In</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4 text-sm uppercase tracking-wide">Legal</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
            <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
            <li><Link to="/partner" className="hover:text-primary transition-colors">Become a Supplier</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/50 py-5">
        <div className="container mx-auto px-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {STORE.legalName}. All rights reserved. · GSTIN: {STORE.gstin}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {POLICY_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="hover:text-primary transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>
        <p className="container mx-auto px-4 mt-2 text-[11px] text-muted-foreground/80">
          {fullAddress()}
        </p>
      </div>
    </footer>
  );
}
