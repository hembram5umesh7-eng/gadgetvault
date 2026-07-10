import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CheckoutSteps, PageHeader } from "@/components/checkout-steps";
import { CartLineItem } from "@/components/cart-line-item";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/order-utils";
import { STORE } from "@/lib/store-info";
import { ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const { items, remove, updateQty, clear, subtotal } = useCart();
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const shipping = subtotal > STORE.freeShippingMin || subtotal === 0 ? 0 : STORE.standardShippingFee;
  const total = subtotal + shipping;
  const amountForFreeShip = Math.max(0, STORE.freeShippingMin - subtotal);

  const goCheckout = () => {
    if (!ready) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/checkout" } });
      return;
    }
    navigate({ to: "/checkout" });
  };

  const clearAll = () => {
    if (!confirm("Remove all items from your cart?")) return;
    clear();
    toast.success("Cart cleared");
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <CheckoutSteps current={1} />
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <PageHeader title="Shopping Cart" subtitle={`${items.length} item${items.length !== 1 ? "s" : ""} in your cart`} />
          {items.length > 0 && (
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5" onClick={clearAll}>
              <Trash2 className="h-4 w-4" /> Clear cart
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="bg-card border rounded-2xl text-center py-20 px-6 shadow-sm">
            <ShoppingBag className="mx-auto h-14 w-14 text-muted-foreground/50 mb-4 stroke-[1.5]" />
            <p className="text-xl font-bold mb-2">Your cart is empty</p>
            <p className="text-muted-foreground text-sm mb-6">Discover premium gadgets at unbeatable prices</p>
            <Button asChild size="lg" className="rounded-xl font-bold"><Link to="/">Start Shopping</Link></Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            <div className="space-y-4">
              {amountForFreeShip > 0 && (
                <div className="px-4 py-3 text-sm bg-primary/5 border border-primary/20 rounded-xl">
                  Add <strong>{formatINR(amountForFreeShip)}</strong> more for <strong>free shipping</strong>
                </div>
              )}
              <div className="space-y-3">
                {items.map((it) => (
                  <CartLineItem key={it.id} item={it} onUpdateQty={updateQty} onRemove={remove} />
                ))}
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-6 h-fit lg:sticky lg:top-28 shadow-sm">
              <h2 className="font-bold text-lg mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(subtotal)}</span></div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? <span className="text-success font-semibold">FREE</span> : formatINR(shipping)}</span>
                </div>
                <div className="border-t pt-3 mt-3 flex justify-between font-extrabold text-xl">
                  <span>Total</span><span>{formatINR(total)}</span>
                </div>
              </div>
              <Button size="lg" className="w-full mt-5 font-bold rounded-xl h-12" onClick={goCheckout}>
                {user ? "Proceed to Checkout" : "Sign in to Checkout"}
              </Button>
              {!user && ready && (
                <p className="text-xs text-center text-muted-foreground mt-3">
                  New here?{" "}
                  <Link to="/auth" search={{ redirect: "/checkout", tab: "signup" }} className="text-primary font-semibold">
                    Create account
                  </Link>
                </p>
              )}
              <p className="text-[11px] text-center text-muted-foreground mt-4 leading-relaxed">
                Secure checkout with Razorpay ·{" "}
                <Link to="/refund" className="text-primary">Refund Policy</Link>
              </p>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
