import { DELIVERY_ESTIMATES } from "@/lib/legal-copy";
import { Package, Truck, Clock, CheckCircle2 } from "lucide-react";

const STEPS = [
  { icon: CheckCircle2, title: "Order confirmed", desc: DELIVERY_ESTIMATES.processingDays + " processing" },
  { icon: Package, title: "Partner dispatch", desc: DELIVERY_ESTIMATES.fulfillmentDays + " prep & handover" },
  { icon: Truck, title: "India courier", desc: DELIVERY_ESTIMATES.courierDays + " transit" },
  { icon: Clock, title: "Typical total", desc: DELIVERY_ESTIMATES.totalTypical + " — estimate only" },
];

export function DeliveryTimelineSection() {
  return (
    <section className="container mx-auto px-4 py-10 md:py-14">
      <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6 md:p-10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Honest delivery</p>
          <h2 className="text-2xl md:text-3xl font-extrabold mt-1">How your order reaches you</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Orders ship via fulfilment partners across India — timelines are estimates, not guaranteed dates.
            Remote areas may take {DELIVERY_ESTIMATES.remoteTypical}.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative p-4 rounded-2xl bg-card border border-border/60 shadow-sm">
                <span className="text-[10px] font-bold text-primary/70">STEP {i + 1}</span>
                <div className="flex items-center gap-2 mt-2 mb-2">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <s.icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="font-bold text-sm">{s.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
