/** UI labels for gadget e-commerce (DB still uses `size` column for model/storage) */

export const VARIANT_SIZE_LABEL = "Model / Storage";
export const VARIANT_COLOR_LABEL = "Color";
export const SPECS_LABEL = "Technical Specifications";
export const WARRANTY_LABEL = "Manufacturer Warranty";

export function formatVariantLine(model: string, color: string) {
  return `${model} · ${color}`;
}

export function formatOrderItemVariant(model: string, color: string) {
  return `${VARIANT_SIZE_LABEL}: ${model} · ${VARIANT_COLOR_LABEL}: ${color}`;
}
