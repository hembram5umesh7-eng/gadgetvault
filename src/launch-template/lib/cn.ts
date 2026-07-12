/** Minimal className merge — no tailwind-merge dependency required */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
