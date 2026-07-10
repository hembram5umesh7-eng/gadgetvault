/** Map common color names (from CJ variantKey) to display hex swatches. */
const COLOR_HEX: Record<string, string> = {
  black: "#1a1a1a",
  white: "#f5f5f5",
  gray: "#9ca3af",
  grey: "#9ca3af",
  silver: "#c0c0c0",
  gold: "#d4af37",
  rosegold: "#b76e79",
  "rose gold": "#b76e79",
  red: "#dc2626",
  blue: "#2563eb",
  navy: "#1e3a5f",
  green: "#16a34a",
  yellow: "#eab308",
  orange: "#ea580c",
  pink: "#ec4899",
  purple: "#9333ea",
  brown: "#78350f",
  beige: "#d6c6a8",
  khaki: "#c3b091",
  ivory: "#fffff0",
  cream: "#fffdd0",
  transparent: "#e5e7eb",
  multicolor: "#6366f1",
  "multi color": "#6366f1",
};

export function colorNameToHex(name: string): string {
  const key = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (COLOR_HEX[key]) return COLOR_HEX[key];
  // Partial match: "Dark Gray" → gray
  for (const [k, hex] of Object.entries(COLOR_HEX)) {
    if (key.includes(k) || k.includes(key)) return hex;
  }
  // Hash fallback for unknown colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}
