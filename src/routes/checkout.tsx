import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { CheckoutSteps, PageHeader } from "@/components/checkout-steps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/order-utils";
import { STORE } from "@/lib/store-info";
import { DELIVERY_ESTIMATES } from "@/lib/legal-copy";
import { CartLineItem } from "@/components/cart-line-item";
import { z } from "zod";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { validateCoupon } from "@/lib/coupon.functions";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay.functions";
import { triggerCJFulfillment } from "@/lib/cj-dropshipping.functions";
import { toast } from "sonner";

import { Card, ShieldTick, Truck, Wallet2 } from "iconsax-react";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export const Route = createFileRoute("/checkout")({ component: Checkout });

const addrSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(10).max(15).regex(/^\+?[0-9]+$/),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().min(4).max(10).regex(/^[0-9]+$/),
});

function Checkout() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const cart = useCart();
  const { items, remove, updateQty, subtotal } = cart;
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const createRzpOrder = useAuthedServerFn(createRazorpayOrder);
  const verifyRzpPayment = useAuthedServerFn(verifyRazorpayPayment);
  const triggerCJ = useAuthedServerFn(triggerCJFulfillment);
  const validateCouponFn = useAuthedServerFn(validateCoupon);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (!user) navigate({ to: "/auth", search: { redirect: "/checkout" } });
  }, [ready, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name,phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setProfileName(data.full_name);
        if (data?.phone) setProfilePhone(data.phone);
      });
  }, [user]);

  const shipping = subtotal > STORE.freeShippingMin || subtotal === 0 ? 0 : STORE.standardShippingFee;
  const total = Math.max(0, subtotal + shipping - discount);

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    try {
      const res = await validateCouponFn({
        data: {
          code: couponInput.trim(),
          subtotal,
          productIds: items.map((i) => i.productId),
        },
      });
      setCouponCode(res.code);
      setDiscount(res.discount);
      toast.success(`Coupon applied — ${formatINR(res.discount)} off`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid coupon");
      setCouponCode("");
      setDiscount(0);
    }
  };

  const placeOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    if (!agreedToTerms) {
      toast.error("Please accept Terms & Privacy Policy to continue");
      return;
    }
    if (items.length === 0) { toast.error("Cart is empty"); return; }

    const fd = new FormData(e.currentTarget);
    const addrParse = addrSchema.safeParse({
      full_name: fd.get("full_name"),
      phone: fd.get("phone"),
      line1: fd.get("line1"),
      line2: fd.get("line2") || undefined,
      city: fd.get("city"),
      state: fd.get("state"),
      pincode: fd.get("pincode"),
    });
    if (!addrParse.success) { toast.error(addrParse.error.issues[0].message); return; }
    const a = addrParse.data;

    setSubmitting(true);
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        status: "received",
        payment_method: paymentMethod === "cod" ? "cod" : "razorpay",
        payment_status: "pending",
        subtotal: subtotal,
        shipping_fee: shipping,
        total,
        coupon_code: couponCode || null,
        discount_amount: discount,
        ship_full_name: a.full_name,
        ship_phone: a.phone,
        ship_line1: a.line1,
        ship_line2: a.line2 ?? null,
        ship_city: a.city,
        ship_state: a.state,
        ship_pincode: a.pincode,
        ship_country: "India",
      })
      .select("id, order_number")
      .single();

    if (orderErr || !order) {
      setSubmitting(false);
      toast.error(orderErr?.message ?? "Order failed");
      return;
    }

    const itemRows = items.map((it) => ({
      order_id: order.id,
      product_id: it.productId,
      variant_id: it.variantId,
      product_name: it.productName,
      size: it.size,
      color: it.color,
      quantity: it.quantity,
      unit_price: it.basePrice,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
    if (itemsErr) {
      setSubmitting(false);
      toast.error(itemsErr.message);
      return;
    }

    const sendToCJ = async () => {
      try {
        const cj = await triggerCJ({ data: { orderId: order.id } });
        if (cj.ok && !cj.skipped) toast.success("Order sent to CJ for fulfillment");
        else if (!cj.ok) toast.warning(`Order placed — CJ: ${cj.message}`);
      } catch (err) {
        toast.warning(
          err instanceof Error ? err.message : "Order placed — CJ sync failed. Admin can retry from Orders.",
        );
      }
    };

    if (paymentMethod === "online") {
      const ok = await loadRazorpayScript();
      if (!ok) {
        setSubmitting(false);
        toast.error("Failed to load payment gateway");
        return;
      }
      try {
        const rzp = await createRzpOrder({ data: { orderId: order.id } });
        const options = {
          key: rzp.keyId,
          amount: rzp.amount,
          currency: rzp.currency,
          name: STORE.name,
          description: `Order ${rzp.orderNumber}`,
          order_id: rzp.razorpayOrderId,
          prefill: { name: a.full_name, contact: a.phone, email: user.email ?? "" },
          theme: { color: "#2563eb" },
          handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              await verifyRzpPayment({
                data: {
                  orderId: order.id,
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                },
              });
              await sendToCJ();
              cart.clear();
              toast.success(`Payment successful · Order ${order.order_number}`);
              navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Payment verification failed");
              setSubmitting(false);
            }
          },
          modal: {
            ondismiss: () => {
              setSubmitting(false);
              toast.message("Payment cancelled. Your order is saved as unpaid.");
              navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
            },
          },
        };
        if (!window.Razorpay) throw new Error("Razorpay unavailable");
        new window.Razorpay(options).open();
      } catch (err) {
        setSubmitting(false);
        toast.error(err instanceof Error ? err.message : "Could not start payment");
      }
      return;
    }

    await sendToCJ();
    cart.clear();
    toast.success(`Order ${order.order_number} placed!`);
    navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
  };

  if (!ready || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/20">
        <SiteHeader />
        <div className="flex-1 container mx-auto px-4 py-12 text-center text-muted-foreground">Loading checkout…</div>
        <SiteFooter />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/20">
        <SiteHeader />
        <main className="flex-1 container mx-auto px-4 py-12 text-center">
          <p className="text-lg font-semibold mb-4">Your cart is empty</p>
          <Button asChild><Link to="/">Continue Shopping</Link></Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <CheckoutSteps current={2} />
        <PageHeader title="Secure Checkout" subtitle="Complete your order with encrypted Razorpay payments" />

        <form onSubmit={placeOrder} className="grid lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            <section className="premium-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Truck size={20} className="text-primary" variant="Bold" />
                <h2 className="font-bold text-lg">Shipping Address</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Full Name</Label>
                  <Input name="full_name" required defaultValue={profileName} key={`name-${profileName}`} className="rounded-xl mt-1.5" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input name="phone" required pattern="[0-9+]+" defaultValue={profilePhone} key={`phone-${profilePhone}`} className="rounded-xl mt-1.5" />
                </div>
                <div>
                  <Label>Pincode</Label>
                  <Input name="pincode" required pattern="[0-9]+" className="rounded-xl mt-1.5" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Address Line 1</Label>
                  <Input name="line1" required className="rounded-xl mt-1.5" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Address Line 2 (optional)</Label>
                  <Input name="line2" className="rounded-xl mt-1.5" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input name="city" required className="rounded-xl mt-1.5" />
                </div>
                <div>
                  <Label>State</Label>
                  <Input name="state" required className="rounded-xl mt-1.5" />
                </div>
              </div>
            </section>

            <section className="premium-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Wallet2 size={20} className="text-primary" variant="Bold" />
                <h2 className="font-bold text-lg">Payment Method</h2>
              </div>
              <div className="space-y-3">
                <label className={`flex gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "cod" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"}`}>
                  <input type="radio" name="pay" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="mt-1" />
                  <div className="flex-1">
                    <p className="font-bold text-sm">Cash on Delivery</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pay when you receive your order</p>
                  </div>
                  <Truck size={22} className="text-muted-foreground shrink-0" />
                </label>
                <label className={`flex gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "online" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"}`}>
                  <input type="radio" name="pay" value="online" checked={paymentMethod === "online"} onChange={() => setPaymentMethod("online")} className="mt-1" />
                  <div className="flex-1">
                    <p className="font-bold text-sm">Pay Online via Razorpay</p>
                    <p className="text-xs text-muted-foreground mt-0.5">UPI · Cards · Netbanking · Wallets</p>
                  </div>
                  <Card size={22} className="text-muted-foreground shrink-0" variant="Bold" />
                </label>
              </div>
            </section>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border">
              <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(v) => setAgreedToTerms(v === true)} className="mt-0.5" />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                I agree to the{" "}
                <Link to="/terms" className="text-primary font-medium hover:underline">Terms & Conditions</Link>,{" "}
                <Link to="/privacy" className="text-primary font-medium hover:underline">Privacy Policy</Link>,{" "}
                <Link to="/refund" className="text-primary font-medium hover:underline">Refund Policy</Link>,{" "}
                <Link to="/shipping" className="text-primary font-medium hover:underline">Shipping Policy</Link>,{" "}
                <Link to="/fulfillment" className="text-primary font-medium hover:underline">Fulfillment Policy</Link>, and{" "}
                <Link to="/disclaimer" className="text-primary font-medium hover:underline">Disclaimer</Link>.
                I understand delivery times are estimates ({DELIVERY_ESTIMATES.totalTypical}), not guaranteed dates.
              </label>
            </div>
          </div>

          <aside className="premium-card p-6 h-fit lg:sticky lg:top-28">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Order Summary</h2>
              <Link to="/cart" className="text-xs font-semibold text-primary hover:underline">Edit cart</Link>
            </div>
            <div className="max-h-80 overflow-y-auto pr-1 -mx-1">
              {items.map((it) => (
                <CartLineItem key={it.id} item={it} onUpdateQty={updateQty} onRemove={remove} compact />
              ))}
            </div>
            <div className="border-t mt-4 pt-4 space-y-2 text-sm">
              <div className="flex gap-2 mb-2">
                <Input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code" className="h-9" />
                <Button type="button" variant="outline" onClick={applyCoupon} className="shrink-0 font-semibold">Apply</Button>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success"><span>Coupon ({couponCode})</span><span>-{formatINR(discount)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(subtotal)}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shipping === 0 ? <span className="text-success font-semibold">FREE</span> : formatINR(shipping)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-xl pt-3 border-t mt-2">
                <span>Total</span><span>{formatINR(total)}</span>
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full mt-5 font-bold rounded-xl h-12" disabled={submitting || !agreedToTerms}>
              {submitting ? "Processing…" : paymentMethod === "online" ? "Pay Securely" : "Place Order"}
            </Button>
            <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
              <ShieldTick size={14} className="text-success" variant="Bold" />
              Secured by Razorpay · 256-bit encryption
            </div>
          </aside>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
