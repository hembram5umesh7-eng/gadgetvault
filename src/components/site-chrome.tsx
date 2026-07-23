import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { recordSearch } from "@/lib/user-personalization";
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
import { cn } from "@/lib/utils";
import { ThemeToggle, ThemeToggleRow } from "@/components/theme-toggle";

const STORE_CATEGORIES = [
  { label: "Kitchen Accessories", slug: "kitchen-accessories" },
  { label: "Unique Gadgets", slug: "unique-gadgets" },
  { label: "Necessities", slug: "necessities" },
];

function HeaderSearchForm({
  q,
  setQ,
  onSubmit,
  className,
  inputClassName,
  inputRef,
  onClose,
}: {
  q: string;
  setQ: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
  inputClassName?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onClose?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className={cn("w-full min-w-0", className)}>
      <div className="relative w-full min-w-0 flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground shrink-0"
            strokeWidth={2.5}
          />
          <Input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            placeholder="Search products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={cn(
              "h-10 w-full min-w-0 pl-9 pr-3 text-sm rounded-xl bg-background border-border",
              "focus-visible:ring-primary/30",
              inputClassName,
            )}
          />
        </div>
        {onClose && (
          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-10 w-10 rounded-xl" onClick={onClose} aria-label="Close search">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}

export function SiteHeader() {
  const { user, isAdmin, isStaff, isSubAdmin, isManufacturer, signOut } = useAuth();
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const { count: compareCount } = useCompare();
  const { categories } = useCategories();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);

  const navItems = categories.length
    ? categories.filter((c) => c.slug).map((c) => ({ label: c.name, slug: c.slug }))
    : STORE_CATEGORIES;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    recordSearch(user?.id ?? null, q.trim());
    navigate({ to: "/search", search: { q: q.trim() } });
    setMobileOpen(false);
    setSearchOpen(false);
  };

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQ("");
  }, []);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [searchOpen, closeSearch]);

  useEffect(() => {
    if (!searchOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchPanelRef.current && !searchPanelRef.current.contains(target)) {
        closeSearch();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [searchOpen, closeSearch]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-xl shadow-sm">
      <div className="bg-gradient-promo text-white text-[10px] sm:text-xs font-medium text-center py-1.5 sm:py-2 px-3 tracking-wide leading-snug">
        Free shipping on orders ₹{STORE.freeShippingMin}+ · Secure Razorpay · Pan-India delivery
      </div>

      {/* Main bar — logo | nav (xl) | search (xl) | actions */}
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex h-14 sm:h-[4.25rem] items-center gap-2 sm:gap-3 min-w-0">
          <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0 group">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors shrink-0">
              <Cpu className="h-4 w-4 sm:h-5 sm:w-5 text-primary" strokeWidth={2.5} />
            </div>
            <div className="leading-none min-w-0">
              <span className="font-extrabold text-base sm:text-lg tracking-tight block truncate">
                Gadget<span className="text-primary">Vault</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-widest hidden min-[400px]:block">
                Premium Tech
              </span>
            </div>
          </Link>

          <nav className="hidden xl:flex items-center gap-0.5 shrink min-w-0 max-w-[50%] overflow-x-auto scrollbar-none">
            {navItems.map((n) => (
              <Link
                key={n.slug}
                to="/category/$category"
                params={{ category: n.slug }}
                className="px-2.5 py-2 text-sm font-semibold text-foreground/80 hover:text-primary rounded-lg hover:bg-primary/5 transition-all whitespace-nowrap"
                activeProps={{ className: "text-primary bg-primary/10" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-0.5 shrink-0 ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn("rounded-xl h-10 w-10 p-0", searchOpen && "bg-primary/10 text-primary")}
              onClick={() => (searchOpen ? closeSearch() : openSearch())}
              aria-label="Search products"
              aria-expanded={searchOpen}
            >
              <Search className="h-5 w-5" strokeWidth={2.5} />
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 rounded-xl h-10 px-2 hover:bg-primary/10">
                    <UserRound className="h-5 w-5" strokeWidth={2.5} />
                    <span className="hidden lg:inline text-sm font-semibold max-w-[88px] truncate">Account</span>
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
                  {isSubAdmin && !isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate({ to: "/subadmin" })}>Sub-Admin Portal</DropdownMenuItem>
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
                className="rounded-xl h-10 gap-1 px-2"
                onClick={() =>
                  navigate({
                    to: "/auth",
                    search: { redirect: typeof window !== "undefined" ? window.location.pathname : "/" },
                  })
                }
              >
                <UserRound className="h-5 w-5" strokeWidth={2.5} />
                <span className="hidden lg:inline font-semibold text-sm">Sign In</span>
              </Button>
            )}

            <ThemeToggle />

            <Button
              variant="ghost"
              size="sm"
              className="relative rounded-xl h-10 w-10 p-0 hidden sm:flex hover:bg-primary/10"
              onClick={() => navigate({ to: "/wishlist" })}
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" strokeWidth={2.5} />
              {wishCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-4 px-0.5 flex items-center justify-center">
                  {wishCount}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="relative rounded-xl h-10 w-10 p-0 hidden md:flex hover:bg-primary/10"
              onClick={() => navigate({ to: "/compare" })}
              aria-label="Compare"
            >
              <LayoutGrid className="h-5 w-5" strokeWidth={2.5} />
              {compareCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-4 px-0.5 flex items-center justify-center">
                  {compareCount}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="relative rounded-xl h-10 min-w-10 px-2 hover:bg-primary/10"
              onClick={() => navigate({ to: "/cart" })}
              aria-label="Cart"
            >
              <ShoppingCart className={cn("h-5 w-5", count > 0 && "text-primary")} strokeWidth={2.5} />
              {count > 0 && (
                <span className="absolute -top-1 right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-4 px-0.5 flex items-center justify-center ring-2 ring-background">
                  {count}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="xl:hidden rounded-xl h-10 w-10 p-0"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {searchOpen && (
          <div ref={searchPanelRef} className="pb-3 pt-0 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="max-w-xl mx-auto">
              <HeaderSearchForm
                q={q}
                setQ={setQ}
                onSubmit={handleSearch}
                inputRef={searchInputRef}
                onClose={closeSearch}
              />
            </div>
          </div>
        )}
      </div>

      {mobileOpen && (
        <div className="xl:hidden border-t bg-background/98 backdrop-blur-xl">
          <nav className="container mx-auto flex flex-col px-3 sm:px-4 py-2">
            <ThemeToggleRow onSelect={() => setMobileOpen(false)} />
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
            <Link
              to="/deals"
              onClick={() => setMobileOpen(false)}
              className="py-3 text-sm font-semibold text-primary"
            >
              Today&apos;s Deals
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { categories } = useCategories();
  const shopLinks = categories.length
    ? categories.filter((c) => c.slug).map((c) => ({ label: c.name, slug: c.slug }))
    : STORE_CATEGORIES;

  return (
    <footer className="border-t bg-gradient-to-b from-muted/20 to-muted/40 mt-auto">
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: ShieldCheck, title: "Secure Payments", desc: "Razorpay encrypted checkout" },
            { icon: Truck, title: "Delivery", desc: `Estimated ${STORE.deliveryDays} pan-India` },
            { icon: Cpu, title: "Listed Products", desc: "Curated catalog, verified listings" },
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
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">{STORE.description}</p>
          <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> {STORE.email}
            </p>
            {hasPhone() && (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" /> {STORE.phone}
              </p>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-bold mb-4 text-sm uppercase tracking-wide">Shop</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {shopLinks.map((c) => (
              <li key={c.slug}>
                <Link to="/category/$category" params={{ category: c.slug }} className="hover:text-primary transition-colors">
                  {c.label}
                </Link>
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
          <p className="container mx-auto px-4 mt-2 text-[11px] text-muted-foreground/80">{fullAddress()}</p>
        )}
      </div>
    </footer>
  );
}
