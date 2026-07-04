import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CheckoutSteps, PageHeader } from "@/components/checkout-steps";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { formatINR } from "@/lib/order-utils";
import { STORE } from "@/lib/store-info";
import { Add, Minus, ShoppingBag, Trash } from "iconsax-react";

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const { items, remove, updateQty, subtotal } = useCart();
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

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <CheckoutSteps current={1} />
        <PageHeader title="Shopping Cart" subtitle={`${items.length} item${items.length !== 1 ? "s" : ""} in your cart`} />

        {items.length === 0 ? (
          <div className="premium-card text-center py-20 px-6">
            <ShoppingBag size={56} className="mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-xl font-bold mb-2">Your cart is empty</p>
            <p className="text-muted-foreground text-sm mb-6">Discover premium gadgets at unbeatable prices</p>
            <Button asChild size="lg" className="rounded-xl font-bold"><Link to="/">Start Shopping</Link></Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            <div className="space-y-4">
              {amountForFreeShip > 0 && (
                <div className="premium-card px-4 py-3 text-sm bg-primary/5 border-primary/20">
                  Add <strong>{formatINR(amountForFreeShip)}</strong> more for <strong>free shipping</strong>
                </div>
              )}
              {items.map((it) => (
                <div key={it.id} className="premium-card flex gap-4 p-4 md:p-5">
                  <div className="w-24 h-24 rounded-xl bg-muted overflow-hidden shrink-0 p-2">
                    {it.productImage && (
                      <img src={it.productImage} alt={it.productName} className="w-full h-full object-contain" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm md:text-base">{it.productName}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{it.color} · {it.size}</p>
                    <div className="mt-3 inline-flex items-center gap-1 rounded-xl border bg-muted/30 p-1">
                      <button type="button" onClick={() => updateQty(it.id, it.quantity - 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-background transition-colors">
                        <Minus size={16} />
                      </button>
                      <span className="font-bold text-sm w-8 text-center">{it.quantity}</span>
                      <button type="button" onClick={() => updateQty(it.id, it.quantity + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-background transition-colors">
                        <Add size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="text-right flex flex-col">
                    <p className="font-extrabold text-lg">{formatINR(it.basePrice * it.quantity)}</p>
                    <button type="button" onClick={() => remove(it.id)} className="mt-auto ml-auto text-muted-foreground hover:text-destructive p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                      <Trash size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="premium-card p-6 h-fit lg:sticky lg:top-28">
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
