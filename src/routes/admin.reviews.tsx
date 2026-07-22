import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { listReviewsAdmin, deleteReviewAdmin, toggleReviewApproved } from "@/lib/review.functions";
import { StarRating } from "@/components/star-rating";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Trash2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviewsPage,
});

type AdminReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  approved: boolean;
  created_at: string;
  authorName: string;
  productName: string;
  productSlug: string;
};

function AdminReviewsPage() {
  const loadFn = useAuthedServerFn(listReviewsAdmin);
  const deleteFn = useAuthedServerFn(deleteReviewAdmin);
  const toggleFn = useAuthedServerFn(toggleReviewApproved);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await loadFn();
    setReviews(res.reviews as AdminReview[]);
  }, [loadFn]);

  useEffect(() => {
    load()
      .catch((e) => toast.error(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Delete this review permanently?")) return;
    try {
      await deleteFn({ data: { id } });
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success("Review deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const toggle = async (id: string, approved: boolean) => {
    try {
      await toggleFn({ data: { id, approved } });
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, approved } : r)));
      toast.success(approved ? "Review visible on storefront" : "Review hidden");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <AdminShell title="Product Reviews" subtitle="Moderate customer reviews — hide spam or delete inappropriate content">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          No reviews yet. They will appear here when customers submit feedback.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className={cn(
                "bg-card border rounded-xl p-4",
                !r.approved && "opacity-70 border-dashed",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <StarRating value={r.rating} readonly size="sm" />
                    <span className="text-xs text-muted-foreground">
                      {r.authorName} · {new Date(r.created_at).toLocaleString("en-IN")}
                    </span>
                    {!r.approved && (
                      <span className="text-[10px] font-bold uppercase bg-muted px-2 py-0.5 rounded">Hidden</span>
                    )}
                  </div>
                  {r.title && <p className="font-bold text-sm">{r.title}</p>}
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{r.body}</p>
                  <Link
                    to="/product/$slug"
                    params={{ slug: r.productSlug }}
                    className="text-xs text-primary font-semibold mt-2 inline-block hover:underline"
                  >
                    {r.productName} →
                  </Link>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void toggle(r.id, !r.approved)}
                    title={r.approved ? "Hide" : "Show"}
                  >
                    {r.approved ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => void remove(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
