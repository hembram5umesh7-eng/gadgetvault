/** Gadget model/storage options (stored in product_variants.size column) */
export const GADGET_MODELS = ["Standard", "128GB", "256GB", "512GB", "1TB"] as const;

/** @deprecated use GADGET_MODELS */
export const APPAREL_SIZES = GADGET_MODELS;

export const PRESET_COLORS = [
  { name: "Black", hex: "#111111" },
  { name: "White", hex: "#F5F5F5" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Green", hex: "#16a34a" },
  { name: "Red", hex: "#dc2626" },
  { name: "Gold", hex: "#D4AF37" },
  { name: "Graphite", hex: "#4B5563" },
] as const;

export interface VariantRow {
  id?: string;
  product_id?: string;
  size: string;
  color: string;
  color_hex: string;
  stock: number;
}

export function variantKey(color: string, size: string) {
  return `${color.toLowerCase()}|${size.toUpperCase()}`;
}

export function summarizeVariants(variants: Pick<VariantRow, "size" | "color">[]) {
  const colors = new Set(variants.map((v) => v.color));
  const models = new Set(variants.map((v) => v.size));
  if (!variants.length) return "No variants";
  return `${colors.size} color${colors.size !== 1 ? "s" : ""} × ${models.size} model${models.size !== 1 ? "s" : ""} (${variants.length} SKUs)`;
}
