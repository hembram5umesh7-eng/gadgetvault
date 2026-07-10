-- 3 store categories + marketing price + coupons

update public.categories set active = false;

insert into public.categories (name, slug, sort_order, image_url, description, active) values
  ('Kitchen Accessories', 'kitchen-accessories', 1, 'https://images.unsplash.com/photo-1556911223-bff03130eb78?w=400', 'Tools & gadgets for your kitchen', true),
  ('Unique Gadgets', 'unique-gadgets', 2, 'https://images.unsplash.com/photo-1585819409453-0e95a44c0d34?w=400', 'Cool & innovative finds', true),
  ('Necessities', 'necessities', 3, 'https://images.unsplash.com/photo-1585771724684-e3823f9ee8ef?w=400', 'Daily essentials & must-haves', true)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  image_url = excluded.image_url,
  description = excluded.description,
  active = true;

update public.products set category = 'unique-gadgets'
  where category in ('smartphones', 'smartwatches', 'audio', 'accessories', 'deals');

update public.products set category = 'necessities'
  where category in ('chargers', 'powerbanks');

update public.products set category = 'kitchen-accessories'
  where category not in ('kitchen-accessories', 'unique-gadgets', 'necessities');

alter table public.products add column if not exists marketing_price numeric(10,2);

update public.products
set marketing_price = ceil(base_price * 1.45)
where marketing_price is null or marketing_price <= base_price;

alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists discount_amount numeric(10,2) not null default 0;

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  min_order_amount numeric(10,2) not null default 0,
  max_discount numeric(10,2),
  applies_to text not null default 'all' check (applies_to in ('all', 'selected')),
  usage_limit int,
  used_count int not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.coupon_products (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (coupon_id, product_id)
);

alter table public.coupons enable row level security;
alter table public.coupon_products enable row level security;

create policy "coupons_public_read_active" on public.coupons for select
  using (active = true);

create policy "coupons_staff_manage" on public.coupons for all
  using (public.is_store_staff(auth.uid()));

create policy "coupon_products_public_read" on public.coupon_products for select using (true);

create policy "coupon_products_staff_manage" on public.coupon_products for all
  using (public.is_store_staff(auth.uid()));
