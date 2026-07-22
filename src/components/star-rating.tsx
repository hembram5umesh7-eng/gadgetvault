import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

export function StarRating({
  value,
  onChange,
  size = "md",
  readonly = false,
}: {
  value: number;
  onChange?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}) {
  const sz = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-4 w-4";

  return (
    <div className="inline-flex items-center gap-0.5" role={readonly ? "img" : "group"} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const btn = (
          <Star
            className={cn(sz, filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
          />
        );
        if (readonly || !onChange) {
          return <span key={star}>{btn}</span>;
        }
        return (
          <button
            key={star}
            type="button"
            className="p-0.5 rounded hover:scale-110 transition-transform"
            onClick={() => onChange(star)}
            aria-label={`Rate ${star} stars`}
          >
            {btn}
          </button>
        );
      })}
    </div>
  );
}

export function StarRatingSummary({
  avg,
  count,
  size = "sm",
}: {
  avg: number;
  count: number;
  size?: "sm" | "md";
}) {
  if (!count) return null;
  return (
    <div className="inline-flex items-center gap-1.5 text-sm">
      <StarRating value={Math.round(avg)} readonly size={size} />
      <span className="font-semibold">{avg.toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </div>
  );
}
