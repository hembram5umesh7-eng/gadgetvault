import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { cancelCustomerOrder } from "@/lib/order.functions";
import { canCustomerCancel, type OrderStatus } from "@/lib/order-utils";
import { toast } from "sonner";
import { friendlyShopperError } from "@/lib/customer-messages";
import { XCircle } from "lucide-react";

export function OrderCancelButton({
  orderId,
  status,
  onCancelled,
  size = "default",
}: {
  orderId: string;
  status: OrderStatus;
  onCancelled?: () => void;
  size?: "default" | "sm";
}) {
  const cancelFn = useAuthedServerFn(cancelCustomerOrder);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!canCustomerCancel(status)) return null;

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await cancelFn({ data: { orderId, reason: reason || undefined } });
      toast.success(`Order ${res.orderNumber} cancelled`);
      if (res.refundNote) toast.info(res.refundNote, { duration: 8000 });
      setOpen(false);
      onCancelled?.();
    } catch (err) {
      toast.error(friendlyShopperError(err, "Could not cancel this order. Please contact support."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className="border-destructive/40 text-destructive hover:bg-destructive/10 gap-1.5 font-semibold"
        >
          <XCircle className="h-4 w-4" />
          Cancel Order
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this order?</DialogTitle>
          <DialogDescription>
            You can cancel before the order is packed for shipping. After cancellation, supplier processing will stop.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Reason (optional)</Label>
          <Textarea
            id="cancel-reason"
            placeholder="Changed my mind, ordered by mistake…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="rounded-xl"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Keep order</Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading} className="font-bold">
            {loading ? "Cancelling…" : "Yes, cancel order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
