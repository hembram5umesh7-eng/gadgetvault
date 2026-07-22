-- Sub-admin role + product push tracking (Dropship India workflow)
-- NOTE: enum value must be committed before rest of file (see scripts/setup-subadmin-db.mjs)
alter type public.app_role add value if not exists 'sub_admin';
create table if not exists public.product_push_log (
  id uuid primary key default gen_random_uuid(),
  shopify_product_id text not null,
  shopify_product_title text not null,
  shopify_product_handle text,
  shopify_product_status text not null default 'DRAFT',
  shopify_image_url text,
  shopify_price_inr numeric(10,2),
  pushed_by uuid not null references auth.users(id) on delete cascade,
  push_source text not null default 'dropship_india',
  admin_live boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_push_log_shopify_product_id_key unique (shopify_product_id)
);

create index if not exists product_push_log_pushed_by_idx on public.product_push_log (pushed_by, created_at desc);
create index if not exists product_push_log_created_idx on public.product_push_log (created_at desc);

alter table public.product_push_log enable row level security;

create or replace function public.is_sub_admin(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _uid and role = 'sub_admin');
$$;

drop policy if exists "product_push_log_admin_read" on public.product_push_log;
create policy "product_push_log_admin_read" on public.product_push_log for select using (
  public.is_super_admin(auth.uid()) or public.is_store_staff(auth.uid())
);

drop policy if exists "product_push_log_subadmin_read_own" on public.product_push_log;
create policy "product_push_log_subadmin_read_own" on public.product_push_log for select using (
  public.is_sub_admin(auth.uid()) and pushed_by = auth.uid()
);

drop policy if exists "product_push_log_subadmin_insert" on public.product_push_log;
create policy "product_push_log_subadmin_insert" on public.product_push_log for insert with check (
  public.is_sub_admin(auth.uid()) and pushed_by = auth.uid()
);

drop policy if exists "product_push_log_admin_update" on public.product_push_log;
create policy "product_push_log_admin_update" on public.product_push_log for update using (
  public.is_super_admin(auth.uid())
);
