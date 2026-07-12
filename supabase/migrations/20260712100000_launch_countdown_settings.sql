-- Launch countdown settings (admin-controlled homepage gate)
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_public_launch_read" on public.app_settings;
create policy "app_settings_public_launch_read" on public.app_settings
  for select using (key = 'launch_countdown');

drop policy if exists "app_settings_no_client_write" on public.app_settings;
create policy "app_settings_no_client_write" on public.app_settings
  for all using (false) with check (false);

insert into public.app_settings (key, value)
values (
  'launch_countdown',
  '{
    "enabled": false,
    "launchAt": "2026-08-15T09:00:00.000Z",
    "headline": "GadgetVault is Launching Soon",
    "tagline": "Premium gadgets & essentials — coming to your doorstep."
  }'::jsonb
)
on conflict (key) do nothing;
