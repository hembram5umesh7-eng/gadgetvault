-- Gadget product fields: brand, warranty, specs rename

DO $$ BEGIN
  ALTER TABLE public.products RENAME COLUMN fabric TO specs;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

alter table public.products add column if not exists brand text;
alter table public.products add column if not exists warranty_months int not null default 12;
alter table public.products add column if not exists is_bestseller boolean not null default false;
alter table public.products add column if not exists is_deal boolean not null default false;

update public.products set brand = coalesce(brand, 'GadgetVault') where brand is null;

-- Fix legacy supplier name
update public.manufacturers set name = 'TechSupply India', shiprocket_pickup_name = 'TechSupply-India'
where name = 'StitchWorks India';
