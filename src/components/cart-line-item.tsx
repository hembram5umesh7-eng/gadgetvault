import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartItem } from "@/lib/cart-context";
import { formatINR } from "@/lib/order-utils";

interface CartLineItemProps {
  item: CartItem;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  compact?: boolean;
}

export function CartLineItem({ item, onUpdateQty, onRemove, compact }: CartLineItemProps) {
  return (
    <div className={`flex gap-3 ${compact ? "py-2 border-b border-border/60 last:border-0" : "p-4 md:p-5 bg-card border rounded-xl"}`}>
      <div className={`rounded-xl bg-muted overflow-hidden shrink-0 p-1.5 ${compact ? "w-14 h-14" : "w-24 h-24"}`}>
        {item.productImage ? (
          <img src={item.productImage} alt={item.productName} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className={`font-bold leading-snug ${compact ? "text-sm line-clamp-2" : "text-sm md:text-base"}`}>
          {item.productName}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{item.color} · {item.size}</p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border-2 border-border bg-background shadow-sm">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => onUpdateQty(item.id, item.quantity - 1)}
              className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-l-md transition-colors text-foreground"
            >
              <Minus className="h-4 w-4 stroke-[2.5]" />
            </button>
            <span className="font-bold text-sm w-9 text-center tabular-nums">{item.quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => onUpdateQty(item.id, item.quantity + 1)}
              className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-r-md transition-colors text-foreground"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 px-2"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-xs font-semibold">Remove</span>
          </Button>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className={`font-extrabold ${compact ? "text-sm" : "text-lg"}`}>{formatINR(item.basePrice * item.quantity)}</p>
        {item.quantity > 1 && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{formatINR(item.basePrice)} each</p>
        )}
      </div>
    </div>
  );
}
