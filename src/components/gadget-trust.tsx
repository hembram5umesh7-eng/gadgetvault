import { ShieldTick, Truck, Cpu, Card } from "iconsax-react";
import { STORE } from "@/lib/store-info";

const ITEMS = [
  { icon: ShieldTick, title: "100% Genuine", desc: "Verified suppliers only" },
  { icon: Cpu, title: "Official Warranty", desc: "Up to 24 months" },
  { icon: Truck, title: "Fast Delivery", desc: `${STORE.deliveryDays} pan-India` },
  { icon: Card, title: "Secure Pay", desc: "Razorpay · UPI · COD" },
] as const;

export function TrustBar({ className = "" }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
      {ITEMS.map((item) => (
        <div key={item.title} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/60 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <item.icon size={22} color="currentColor" className="text-primary" variant="Bold" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight">{item.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PaymentStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 py-6 text-xs text-muted-foreground border-t">
      <span className="font-bold uppercase tracking-wider text-foreground/60 w-full text-center md:w-auto mb-1 md:mb-0">We accept</span>
      {["UPI", "Visa", "Mastercard", "RuPay", "Netbanking", "Wallets", "COD"].map((m) => (
        <span key={m} className="px-3 py-1.5 rounded-lg bg-muted font-semibold text-foreground/80 border border-border/50">
          {m}
        </span>
      ))}
    </div>
  );
}
