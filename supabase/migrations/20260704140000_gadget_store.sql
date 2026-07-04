-- GadgetVault store: gadget categories + order prefix

delete from public.categories;

insert into public.categories (name, slug, sort_order, image_url, description) values
  ('Smartphones', 'smartphones', 1, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 'Latest smartphones & mobile devices'),
  ('Earbuds & Audio', 'audio', 2, 'https://images.unsplash.com/photo-1598331668826-35cecc0a0d04?w=400', 'TWS, headphones & speakers'),
  ('Chargers & Cables', 'chargers', 3, 'https://images.unsplash.com/photo-1583394838336-acd977736298?w=400', 'Fast chargers, cables & adapters'),
  ('Smartwatches', 'smartwatches', 4, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', 'Smart watches & fitness bands'),
  ('Power Banks', 'powerbanks', 5, 'https://images.unsplash.com/photo-1609091839311-9a442fbd5297?w=400', 'Portable power solutions'),
  ('Accessories', 'accessories', 6, 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400', 'Cases, stands & more')
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  image_url = excluded.image_url,
  description = excluded.description;

-- Update order number prefix from TF to GV
alter sequence if exists public.order_number_seq restart with 100001;

create or replace function public.default_order_number()
returns text language sql as $$
  select 'GV' || nextval('public.order_number_seq')::text
$$;
