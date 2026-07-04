-- Supplier warehouse fields for Shiprocket pickup (courier picks up from supplier address)
alter table public.manufacturers
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists pincode text,
  add column if not exists shiprocket_pickup_name text;

-- Default StitchWorks India warehouse (Surat)
update public.manufacturers
set
  address = coalesce(nullif(trim(address), ''), 'Plot 12, Industrial Area, Udhna'),
  city = coalesce(city, 'Surat'),
  state = coalesce(state, 'Gujarat'),
  pincode = coalesce(pincode, '394210'),
  shiprocket_pickup_name = coalesce(
    shiprocket_pickup_name,
    left(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), 36)
  )
where name = 'StitchWorks India';

update public.manufacturers
set
  shiprocket_pickup_name = coalesce(
    shiprocket_pickup_name,
    left(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), 36)
  )
where shiprocket_pickup_name is null;
