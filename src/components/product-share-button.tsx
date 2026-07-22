import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Link2, Check } from "lucide-react";
import { toast } from "sonner";

export function ProductShareButton({
  productName,
  productSlug,
  imageUrl,
}: {
  productName: string;
  productSlug: string;
  imageUrl?: string;
}) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/product/${productSlug}`
    : `/product/${productSlug}`;

  const shareText = `Check out ${productName} on GadgetVault!`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: productName,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    await copyLink();
  };

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex gap-2 flex-1">
      <Button variant="outline" size="sm" className="rounded-xl flex-1" onClick={() => void share()}>
        <Share2 className="h-4 w-4 mr-1.5" />
        Share
      </Button>
      <Button variant="outline" size="sm" className="rounded-xl px-3" onClick={() => void copyLink()} title="Copy link">
        {copied ? <Check className="h-4 w-4 text-success" /> : <Link2 className="h-4 w-4" />}
      </Button>
      <Button variant="outline" size="sm" className="rounded-xl px-3" onClick={shareWhatsApp} title="Share on WhatsApp">
        <span className="text-xs font-bold text-[#25D366]">WA</span>
      </Button>
    </div>
  );
}
