-- GadgetVault full catalog seed (run after migrations)

insert into public.products (name, slug, category, description, base_price, specs, brand, warranty_months, is_bestseller, is_deal, images, active)
values
  (
    'Pro TWS Earbuds X3',
    'pro-tws-earbuds-x3',
    'audio',
    'Active noise cancellation with 40hr battery life. Crystal-clear calls with dual mic array and low-latency gaming mode.',
    2499.00,
    'Connectivity: BT 5.3 · Driver: 10mm · ANC: Yes · Battery: 40hr (case) · IP Rating: IPX5 · Charging: USB-C',
    'boAt',
    12,
    true,
    true,
    array['https://images.unsplash.com/photo-1598331668826-35cecc0a0d04?w=800'],
    true
  ),
  (
    '65W GaN Fast Charger',
    '65w-gan-fast-charger',
    'chargers',
    'Compact GaN technology charger with USB-C PD 65W. Charges laptop, phone and tablet simultaneously.',
    1899.00,
    'Power: 65W PD · Technology: GaN · Ports: Dual USB-C + USB-A · Input: 100-240V · Protection: OVP/OCP',
    'Portronics',
    12,
    true,
    false,
    array['https://images.unsplash.com/photo-1583394838336-acd977736298?w=800'],
    true
  ),
  (
    'Smart Watch Pro S',
    'smart-watch-pro-s',
    'smartwatches',
    'AMOLED display with SpO2, heart rate, GPS and 100+ sports modes. 7-day battery with always-on display.',
    3999.00,
    'Display: 1.43 AMOLED · GPS: Yes · SpO2: Yes · Sports Modes: 100+ · Battery: 7 days · Water Resist: 5 ATM',
    'Noise',
    12,
    true,
    true,
    array['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
    true
  ),
  (
    '20000mAh Power Bank Ultra',
    '20000mah-power-bank-ultra',
    'powerbanks',
    '20000mAh capacity with 22.5W fast charging. LED display shows exact battery percentage.',
    1499.00,
    'Capacity: 20000mAh · Output: 22.5W · Ports: USB-C in/out · Display: LED % · Weight: 380g',
    'Mi',
    6,
    false,
    true,
    array['https://images.unsplash.com/photo-1609091839311-9a442fbd5297?w=800'],
    true
  ),
  (
    'MagSafe Phone Case Pro',
    'magsafe-phone-case-pro',
    'accessories',
    'Premium silicone case with MagSafe compatibility. Military-grade drop protection for daily use.',
    899.00,
    'Compatibility: MagSafe · Material: Silicone · Drop Protection: MIL-STD · Finish: Soft-touch',
    'Apple',
    6,
    false,
    false,
    array['https://images.unsplash.com/photo-1625842268584-8f3296236761?w=800'],
    true
  ),
  (
    'USB-C Hub 7-in-1',
    'usb-c-hub-7-in-1',
    'accessories',
    '7-in-1 hub with HDMI 4K, 3x USB 3.0, SD/TF card reader and 100W PD pass-through.',
    2199.00,
    'HDMI: 4K@30Hz · USB: 3× USB 3.0 · Card Reader: SD/TF · PD Pass-through: 100W · Material: Aluminium',
    'Portronics',
    12,
    true,
    false,
    array['https://images.unsplash.com/photo-1625948515291-69613efd447f?w=800'],
    true
  ),
  (
    'Over-Ear Studio Headphones',
    'over-ear-studio-headphones',
    'audio',
    '40mm drivers with studio-quality sound and 30hr playtime. Foldable design with premium padding.',
    3299.00,
    'Driver: 40mm · Battery: 30hr · Codec: AAC/SBC · Foldable: Yes · Mic: Built-in · Hi-Res: Yes',
    'boAt',
    12,
    false,
    false,
    array['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
    true
  ),
  (
    'Wireless Charging Pad 15W',
    'wireless-charging-pad',
    'chargers',
    '15W fast wireless charging pad. Qi-certified, works with all Qi-enabled smartphones and earbuds.',
    799.00,
    'Output: 15W Qi · Indicator: LED · Base: Non-slip · Cert: Qi · Input: USB-C',
    'Realme',
    6,
    false,
    true,
    array['https://images.unsplash.com/photo-1591290619762-d2a4a7a2a0a0?w=800'],
    true
  ),
  (
    'Buds Air Pro TWS',
    'buds-air-pro-tws',
    'audio',
    'ENC dual mic, 28hr total battery, touch controls and instant pairing for seamless daily use.',
    1799.00,
    'Connectivity: BT 5.2 · Battery: 28hr · ENC: Dual mic · Latency: 60ms · IP Rating: IPX4',
    'Realme',
    12,
    true,
    true,
    array['https://images.unsplash.com/photo-1572569511254-d8f925fa2f9?w=800'],
    true
  ),
  (
    'Smart Band 8 Fitness',
    'smart-band-8-fitness',
    'smartwatches',
    'AMOLED band with SpO2, sleep tracking, 110 sports modes and 14-day battery life.',
    2499.00,
    'Display: AMOLED · SpO2: Yes · Sports: 110 modes · Battery: 14 days · Water: 5 ATM',
    'Mi',
    12,
    false,
    true,
    array['https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800'],
    true
  ),
  (
    '10000mAh Slim Power Bank',
    '10000mah-slim-power-bank',
    'powerbanks',
    'Ultra-slim 10000mAh power bank with 18W PD fast charge. Pocket-friendly for travel.',
    999.00,
    'Capacity: 10000mAh · Output: 18W PD · Ports: USB-C + USB-A · Weight: 220g · Slim: 14mm',
    'OnePlus',
    6,
    false,
    false,
    array['https://images.unsplash.com/photo-1609592806596-451977c4562f?w=800'],
    true
  ),
  (
    'Tempered Glass Screen Guard',
    'tempered-glass-screen-guard',
    'accessories',
    '9H hardness tempered glass with oleophobic coating. Edge-to-edge coverage with easy install kit.',
    299.00,
    'Hardness: 9H · Coating: Oleophobic · Coverage: Edge-to-edge · Kit: Install frame included',
    'Samsung',
    3,
    false,
    false,
    array['https://images.unsplash.com/photo-1601784551445-20e9efe3db1?w=800'],
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  base_price = excluded.base_price,
  specs = excluded.specs,
  brand = excluded.brand,
  warranty_months = excluded.warranty_months,
  is_bestseller = excluded.is_bestseller,
  is_deal = excluded.is_deal,
  images = excluded.images,
  active = excluded.active;

insert into public.product_variants (product_id, size, color, color_hex, stock)
select p.id, v.size, v.color, v.color_hex, v.stock
from public.products p
cross join lateral (
  values
    ('Standard', 'Black', '#111111', 80),
    ('Standard', 'White', '#F5F5F5', 55),
    ('Standard', 'Blue', '#2563EB', 40)
) as v(size, color, color_hex, stock)
where p.slug in (
  'pro-tws-earbuds-x3', '65w-gan-fast-charger', 'smart-watch-pro-s',
  '20000mah-power-bank-ultra', 'magsafe-phone-case-pro', 'usb-c-hub-7-in-1',
  'over-ear-studio-headphones', 'wireless-charging-pad', 'buds-air-pro-tws',
  'smart-band-8-fitness', '10000mah-slim-power-bank', 'tempered-glass-screen-guard'
)
on conflict (product_id, size, color) do nothing;

insert into public.manufacturers (name, contact_email, contact_phone, address, city, state, pincode, shiprocket_pickup_name, active)
select
  'TechSupply India',
  'orders@techsupply.in',
  '+91-9876543210',
  'Plot 45, Electronics Hub, Sector 18',
  'Noida',
  'Uttar Pradesh',
  '201301',
  'TechSupply-India',
  true
where not exists (
  select 1 from public.manufacturers where name = 'TechSupply India'
);
