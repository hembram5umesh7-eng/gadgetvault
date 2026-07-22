alter table public.payments
  add column if not exists refund_id text,
  add column if not exists refund_status text,
  add column if not exists provider_order_id text;

create index if not exists payments_refund_id_idx on public.payments (refund_id)
  where refund_id is not null;
