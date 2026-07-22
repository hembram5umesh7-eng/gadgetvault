-- Product reviews + referral system

-- =========================================================
-- PROFILES: track who referred this user
-- =========================================================
alter table public.profiles
  add column if not exists referred_by uuid references auth.users(id) on delete set null;

create index if not exists idx_profiles_referred_by on public.profiles(referred_by);

-- =========================================================
-- PRODUCT REVIEWS
-- =========================================================
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text not null check (char_length(trim(body)) >= 10),
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists idx_product_reviews_product on public.product_reviews(product_id, created_at desc);
create index if not exists idx_product_reviews_user on public.product_reviews(user_id);

alter table public.product_reviews enable row level security;

drop policy if exists "product_reviews_public_read" on public.product_reviews;
create policy "product_reviews_public_read" on public.product_reviews
  for select using (approved = true);

drop policy if exists "product_reviews_own_read" on public.product_reviews;
create policy "product_reviews_own_read" on public.product_reviews
  for select using (auth.uid() = user_id);

drop policy if exists "product_reviews_insert_own" on public.product_reviews;
create policy "product_reviews_insert_own" on public.product_reviews
  for insert with check (auth.uid() = user_id);

drop policy if exists "product_reviews_update_own" on public.product_reviews;
create policy "product_reviews_update_own" on public.product_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "product_reviews_delete_own" on public.product_reviews;
create policy "product_reviews_delete_own" on public.product_reviews
  for delete using (auth.uid() = user_id);

-- =========================================================
-- REFERRAL CODES (one per user)
-- =========================================================
create table if not exists public.referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text unique not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_referral_codes_code on public.referral_codes(code);

alter table public.referral_codes enable row level security;

drop policy if exists "referral_codes_public_read" on public.referral_codes;
create policy "referral_codes_public_read" on public.referral_codes
  for select using (true);

drop policy if exists "referral_codes_no_client_write" on public.referral_codes;
create policy "referral_codes_no_client_write" on public.referral_codes
  for all using (false) with check (false);

-- =========================================================
-- REFERRAL REDEMPTIONS (referred user uses discount once)
-- =========================================================
create table if not exists public.referral_redemptions (
  id uuid primary key default gen_random_uuid(),
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referral_code text not null,
  order_id uuid references public.orders(id) on delete set null,
  referred_discount integer not null default 0 check (referred_discount >= 0),
  referrer_reward_coupon_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_referral_redemptions_referrer on public.referral_redemptions(referrer_user_id);

alter table public.referral_redemptions enable row level security;

drop policy if exists "referral_redemptions_own_read" on public.referral_redemptions;
create policy "referral_redemptions_own_read" on public.referral_redemptions
  for select using (auth.uid() = referred_user_id or auth.uid() = referrer_user_id);

drop policy if exists "referral_redemptions_no_client_write" on public.referral_redemptions;
create policy "referral_redemptions_no_client_write" on public.referral_redemptions
  for all using (false) with check (false);

-- =========================================================
-- APP SETTINGS: referral program config (admin-controlled)
-- =========================================================
insert into public.app_settings (key, value)
values (
  'referral_settings',
  '{
    "enabled": true,
    "referredDiscountType": "percent",
    "referredDiscountValue": 10,
    "referrerRewardType": "percent",
    "referrerRewardValue": 5,
    "maxReferredDiscount": 500,
    "maxReferrerReward": 300,
    "minOrderAmount": 499,
    "codePrefix": "GV"
  }'::jsonb
)
on conflict (key) do nothing;

drop policy if exists "app_settings_public_read" on public.app_settings;
create policy "app_settings_public_read" on public.app_settings
  for select using (key in ('launch_countdown', 'flash_sale', 'referral_settings'));

-- Review summary view for storefront
create or replace view public.product_review_stats as
select
  product_id,
  count(*)::int as review_count,
  round(avg(rating)::numeric, 1) as avg_rating
from public.product_reviews
where approved = true
group by product_id;

grant select on public.product_review_stats to anon, authenticated;
