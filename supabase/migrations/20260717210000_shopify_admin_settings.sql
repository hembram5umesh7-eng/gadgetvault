-- Shopify Admin token stored server-side (admin pastes once in /admin/shopify)
insert into public.app_settings (key, value)
values ('shopify_admin', '{"access_token": null}'::jsonb)
on conflict (key) do nothing;

comment on table public.app_settings is 'Server-managed settings; shopify_admin key is never exposed to clients';
