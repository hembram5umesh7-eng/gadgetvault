import { Link } from "@tanstack/react-router";
import { ShieldCheck, FileText, Scale, Truck } from "lucide-react";

const LEGAL_BADGES = [
  { icon: FileText, label: "Terms", to: "/terms" as const },
  { icon: ShieldCheck, label: "Privacy", to: "/privacy" as const },
  { icon: Truck, label: "Shipping", to: "/shipping" as const },
  { icon: Scale, label: "Grievance", to: "/grievance" as const },
];

export function LegalTrustStrip({ className = "" }: { className?: string }) {
  return (
    <section className={`rounded-2xl border border-primary/15 bg-muted/40 p-4 md:p-5 ${className}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 text-center">
        Transparent policies — read before you buy
      </p>
      <div className="flex flex-wrap justify-center gap-2 md:gap-3">
        {LEGAL_BADGES.map((b) => (
          <Link
            key={b.to}
            to={b.to}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-background border text-xs font-semibold hover:border-primary/40 hover:text-primary transition-colors"
          >
            <b.icon className="h-3.5 w-3.5 text-primary" />
            {b.label}
          </Link>
        ))}
        <Link
          to="/fulfillment"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
        >
          Fulfillment Policy →
        </Link>
      </div>
    </section>
  );
}
