import { useEffect, useState } from "react";
import {
  looksLikeHtml,
  stripHtmlTags,
  PRODUCT_HTML_PURIFY_CONFIG,
} from "@/lib/sanitize-html";
import { cn } from "@/lib/utils";

export function ProductHtmlContent({
  html,
  className,
  emptyText = "Product details will appear here once added by the supplier.",
}: {
  html: string | null | undefined;
  className?: string;
  emptyText?: string;
}) {
  const raw = html?.trim();
  const [safeHtml, setSafeHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!raw || !looksLikeHtml(raw)) return;
    let cancelled = false;
    import("dompurify").then(({ default: DOMPurify }) => {
      if (cancelled) return;
      setSafeHtml(DOMPurify.sanitize(raw, PRODUCT_HTML_PURIFY_CONFIG));
    });
    return () => {
      cancelled = true;
    };
  }, [raw]);

  if (!raw) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{emptyText}</p>;
  }

  if (!looksLikeHtml(raw)) {
    return (
      <p className={cn("text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap", className)}>
        {raw}
      </p>
    );
  }

  const preview = stripHtmlTags(raw);
  if (!preview) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{emptyText}</p>;
  }

  if (!safeHtml) {
    return (
      <p className={cn("text-sm text-muted-foreground leading-relaxed", className)}>
        {preview}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "product-html prose prose-sm max-w-none text-foreground/90",
        "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-3",
        "[&_table]:w-full [&_table]:text-sm [&_td]:border [&_td]:px-2 [&_td]:py-1",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
