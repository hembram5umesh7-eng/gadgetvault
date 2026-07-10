-- Fix: admin can delete products that were ordered (order history kept via product_name snapshot)
alter table public.order_items drop constraint if exists order_items_product_id_fkey;
alter table public.order_items alter column product_id drop not null;
alter table public.order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id) references public.products(id) on delete set null;

alter table public.order_items drop constraint if exists order_items_variant_id_fkey;
alter table public.order_items
  add constraint order_items_variant_id_fkey
  foreign key (variant_id) references public.product_variants(id) on delete set null;

-- Performance indexes for catalog + admin at scale
create index if not exists products_active_category_idx on public.products (category, created_at desc) where active = true;
create index if not exists products_slug_idx on public.products (slug);
create index if not exists order_items_product_id_idx on public.order_items (product_id) where product_id is not null;
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
