-- Shopify headless migration helpers

alter table public.orders
  add column if not exists shopify_order_id text,
  add column if not exists shopify_draft_order_id text;

create index if not exists idx_orders_shopify_order on public.orders(shopify_order_id) where shopify_order_id is not null;

-- Reviews: add slug column (keep product_id as-is for compatibility)
alter table public.product_reviews add column if not exists product_slug text;
create index if not exists idx_product_reviews_slug on public.product_reviews(product_slug);

-- Drop old stats view if exists, recreate by slug
drop view if exists public.product_review_stats;

create or replace view public.product_review_stats as
select
  coalesce(product_slug, product_id::text) as product_key,
  product_slug,
  count(*)::int as review_count,
  round(avg(rating)::numeric, 1) as avg_rating
from public.product_reviews
where approved = true
group by coalesce(product_slug, product_id::text), product_slug;

grant select on public.product_review_stats to anon, authenticated;

-- Flash sale: add handle column (keep product_id for compatibility)
alter table public.flash_sale_items add column if not exists product_handle text;
create index if not exists idx_flash_sale_items_handle on public.flash_sale_items(product_handle) where product_handle is not null;

-- Reviews unique by slug+user
create unique index if not exists product_reviews_slug_user_idx on public.product_reviews(product_slug, user_id) where product_slug is not null;

comment on column public.products.fulfillment_source is 'deprecated — products now from Shopify';
