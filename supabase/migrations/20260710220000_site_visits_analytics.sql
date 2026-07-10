-- Anonymous visit tracking for admin analytics (service-role inserts only)
create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  visited_at timestamptz not null default now(),
  session_key text not null,
  path text not null default '/',
  user_id uuid references auth.users(id) on delete set null
);

create index if not exists site_visits_visited_at_idx on public.site_visits (visited_at desc);
create index if not exists site_visits_session_visited_idx on public.site_visits (session_key, visited_at desc);

alter table public.site_visits enable row level security;

-- Block direct client access; server uses service role
create policy "site_visits_no_client"
  on public.site_visits
  for all
  using (false)
  with check (false);
