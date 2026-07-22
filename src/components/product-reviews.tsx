import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating, StarRatingSummary } from "@/components/star-rating";
import { useAuth } from "@/lib/auth-context";
import { useAuthedServerFn } from "@/lib/use-authed-server-fn";
import { submitProductReview } from "@/lib/review.functions";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export type ProductReviewRow = {
  id: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string;
  created_at: string;
  authorName: string;
};

export function ProductReviews({
  productId,
  productSlug,
  productName,
  userId,
  initialReviews,
  initialAvg,
  initialCount,
}: {
  productId: string;
  productSlug: string;
  productName: string;
  userId?: string | null;
  initialReviews: ProductReviewRow[];
  initialAvg: number;
  initialCount: number;
}) {
  const { user } = useAuth();
  const currentUserId = userId ?? user?.id;
  const submitFn = useAuthedServerFn(submitProductReview);
  const [reviews, setReviews] = useState(initialReviews);
  const [avg, setAvg] = useState(initialAvg);
  const [count, setCount] = useState(initialCount);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const myReview = currentUserId ? reviews.find((r) => r.userId === currentUserId) : null;

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setTitle(myReview.title ?? "");
      setBody(myReview.body);
    }
  }, [myReview?.id]);

  const submit = async () => {
    if (!user) {
      toast.error("Sign in to write a review");
      return;
    }
    if (body.trim().length < 10) {
      toast.error("Review must be at least 10 characters");
      return;
    }
    setBusy(true);
    try {
      const res = await submitFn({
        data: { productId: product.id, productSlug: product.slug, rating, title: title.trim() || undefined, body: body.trim() },
      });
      const newRow: ProductReviewRow = {
        id: res.review.id,
        userId: currentUserId!,
        rating: res.review.rating,
        title: res.review.title,
        body: res.review.body,
        created_at: res.review.created_at,
        authorName: "You",
      };
      const withoutMine = reviews.filter((r) => r.userId !== currentUserId);
      const next = [newRow, ...withoutMine];
      setReviews(next);
      const nextCount = myReview ? count : count + 1;
      const total = next.reduce((s, r) => s + r.rating, 0);
      setCount(nextCount);
      setAvg(nextCount ? total / nextCount : 0);
      toast.success(myReview ? "Review updated" : "Thanks for your review!");
      setTitle("");
      setBody("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit review");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-lg">Customer Reviews</h3>
          {count > 0 ? (
            <StarRatingSummary avg={avg} count={count} size="md" />
          ) : (
            <p className="text-sm text-muted-foreground">Be the first to review {productName}</p>
          )}
        </div>
      </div>

      {user ? (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h4 className="font-semibold">{myReview ? "Update your review" : "Write a review"}</h4>
          <div>
            <Label>Your rating</Label>
            <div className="mt-2">
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>
          </div>
          <div>
            <Label htmlFor="review-title">Title (optional)</Label>
            <Input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Great product!"
              className="mt-1"
              maxLength={80}
            />
          </div>
          <div>
            <Label htmlFor="review-body">Your review</Label>
            <Textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your experience with this product…"
              className="mt-1 min-h-[100px]"
              maxLength={2000}
            />
          </div>
          <Button onClick={() => void submit()} disabled={busy} className="font-bold">
            {busy ? "Submitting…" : myReview ? "Update review" : "Submit review"}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
          <Link to="/auth" search={{ redirect: window.location.pathname }} className="text-primary font-semibold hover:underline">
            Sign in
          </Link>{" "}
          to write a review
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-semibold">No reviews yet</p>
          <p className="text-sm text-muted-foreground mt-2">Real feedback from shoppers will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <article key={r.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-sm">{r.authorName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <StarRating value={r.rating} readonly size="sm" />
              </div>
              {r.title && <p className="font-bold text-sm mb-1">{r.title}</p>}
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{r.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
