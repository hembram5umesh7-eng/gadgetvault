
-- Lock search_path on trigger helpers
alter function public.set_updated_at() set search_path = public;
alter function public.handle_new_user() set search_path = public;

-- Revoke public/anon execute on internal functions; only authenticated may call has_role
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Tighten storage SELECT: replace permissive read with authenticated-only listing.
-- Public file URLs from `public` buckets remain accessible via the CDN even without SELECT.
drop policy if exists "product_images_public_read" on storage.objects;
drop policy if exists "designs_public_read" on storage.objects;

create policy "product_images_auth_read" on storage.objects for select
  to authenticated using (bucket_id = 'product-images');

create policy "designs_auth_read" on storage.objects for select
  to authenticated using (bucket_id = 'custom-designs');
