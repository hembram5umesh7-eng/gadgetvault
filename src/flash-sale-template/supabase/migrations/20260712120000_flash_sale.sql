-- Flash Sale: admin-controlled deals with per-product pricing
-- Requires: public.products, public.app_settings tables

create table if not exists public.flash_sale_items (
  product_id uuid primary key references public.products(id) on delete cascade,
  sale_price integer not null check (sale_price > 0),
  display_mrp integer check (display_mrp is null or display_mrp > 0),
  updated_at timestamptz not null default now()
);

alter table public.flash_sale_items enable row level security;

drop policy if exists "flash_sale_items_public_read" on public.flash_sale_items;
create policy "flash_sale_items_public_read" on public.flash_sale_items
  for select using (true);

drop policy if exists "flash_sale_items_no_client_write" on public.flash_sale_items;
create policy "flash_sale_items_no_client_write" on public.flash_sale_items
  for all using (false) with check (false);

-- Allow public read of flash_sale settings (adjust if you use different app_settings policies)
drop policy if exists "app_settings_public_launch_read" on public.app_settings;
drop policy if exists "app_settings_public_read" on public.app_settings;
create policy "app_settings_public_read" on public.app_settings
  for select using (key in ('launch_countdown', 'flash_sale'));

insert into public.app_settings (key, value)
values (
  'flash_sale',
  '{
    "enabled": false,
    "title": "Flash Sale",
    "subtitle": "Limited-time offers on selected products",
    "categorySlugs": []
  }'::jsonb
)
on conflict (key) do nothing;

create index if not exists idx_flash_sale_items_updated on public.flash_sale_items(updated_at desc);

-- Ensure products.is_deal exists (skip if already present)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'is_deal'
  ) then
    alter table public.products add column is_deal boolean not null default false;
  end if;
end $$;
