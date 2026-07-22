-- Shopify headless: order line items reference Shopify GIDs, not local product UUIDs

alter table public.order_items
  add column if not exists shopify_product_id text,
  add column if not exists shopify_variant_id text,
  add column if not exists product_slug text;

create index if not exists idx_order_items_shopify_product
  on public.order_items(shopify_product_id)
  where shopify_product_id is not null;

create index if not exists idx_order_items_product_slug
  on public.order_items(product_slug)
  where product_slug is not null;

comment on column public.order_items.shopify_product_id is 'Shopify Product GID from headless catalog';
comment on column public.order_items.shopify_variant_id is 'Shopify ProductVariant GID';
comment on column public.order_items.product_slug is 'Shopify product handle at time of order';
