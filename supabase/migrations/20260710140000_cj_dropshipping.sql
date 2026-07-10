-- CJ Dropshipping integration fields

alter table public.products
  add column if not exists cj_product_id text,
  add column if not exists cj_sku text,
  add column if not exists cj_cost_usd numeric(10,2),
  add column if not exists fulfillment_source text not null default 'local';

alter table public.product_variants
  add column if not exists cj_variant_id text;

alter table public.orders
  add column if not exists cj_order_id text,
  add column if not exists cj_status text,
  add column if not exists cj_tracking_number text,
  add column if not exists cj_error text,
  add column if not exists cj_submitted_at timestamptz;

create index if not exists products_cj_product_id_idx on public.products(cj_product_id) where cj_product_id is not null;
create index if not exists products_fulfillment_source_idx on public.products(fulfillment_source);
create index if not exists orders_cj_order_id_idx on public.orders(cj_order_id) where cj_order_id is not null;

comment on column public.products.fulfillment_source is 'local = manual/stock, cj = CJ Dropshipping auto-fulfill';
