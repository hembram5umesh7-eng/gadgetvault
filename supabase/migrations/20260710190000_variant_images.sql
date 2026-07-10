-- Per-variant image from CJ (color-specific product photo)
alter table public.product_variants
  add column if not exists variant_image text;

comment on column public.product_variants.variant_image is 'CJ variant image URL — shown when customer picks this color';
