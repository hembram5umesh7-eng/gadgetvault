import { Link } from "@tanstack/react-router";
import { TickCircle } from "iconsax-react";

interface CheckoutStepsProps {
  current: 1 | 2 | 3;
}

const STEPS = [
  { n: 1, label: "Cart", to: "/cart" as const },
  { n: 2, label: "Checkout", to: "/checkout" as const },
  { n: 3, label: "Confirmation", to: null },
];

export function CheckoutSteps({ current }: CheckoutStepsProps) {
  return (
    <nav aria-label="Checkout progress" className="flex items-center justify-center gap-2 md:gap-4 mb-8">
      {STEPS.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <div key={s.n} className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  done ? "bg-success text-success-foreground" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <TickCircle size={18} variant="Bold" /> : s.n}
              </div>
              {s.to && (done || active) ? (
                <Link to={s.to} className={`text-sm font-semibold hidden sm:block ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {s.label}
                </Link>
              ) : (
                <span className={`text-sm font-semibold hidden sm:block ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 md:w-16 ${done ? "bg-success" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
