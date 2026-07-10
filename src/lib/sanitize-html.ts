/** Strip HTML tags for SSR preview (not a security boundary — client DOMPurify runs on hydrate). */
export function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function looksLikeHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text.trim());
}

export const PRODUCT_HTML_PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "b", "strong", "i", "em", "ul", "ol", "li",
    "img", "h2", "h3", "h4", "div", "span",
    "table", "thead", "tbody", "tr", "td", "th",
  ],
  ALLOWED_ATTR: ["src", "alt", "class", "href", "target", "rel", "width", "height"],
  ALLOW_DATA_ATTR: false,
} as const;
