-- ============================================================
-- Migration 003: Storage Buckets
-- Run in Supabase SQL editor
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('artist-images',     'artist-images',     true),
  ('show-posters',      'show-posters',       true),
  ('generated-posters', 'generated-posters',  true),
  ('ticket-assets',     'ticket-assets',      false),
  ('invoice-files',     'invoice-files',      false)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- artist-images
--   Public read, authenticated artist uploads own image, admin manages all
-- ─────────────────────────────────────────────────────────────
create policy "Public read artist-images"
  on storage.objects for select
  using (bucket_id = 'artist-images');

create policy "Artist uploads own image"
  on storage.objects for insert
  with check (
    bucket_id = 'artist-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Artist updates own image"
  on storage.objects for update
  using (
    bucket_id = 'artist-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Admin manages artist-images"
  on storage.objects for all
  using (bucket_id = 'artist-images' and is_admin());

-- ─────────────────────────────────────────────────────────────
-- show-posters — public read, admin upload
-- ─────────────────────────────────────────────────────────────
create policy "Public read show-posters"
  on storage.objects for select
  using (bucket_id = 'show-posters');

create policy "Admin manages show-posters"
  on storage.objects for all
  using (bucket_id = 'show-posters' and is_admin());

-- ─────────────────────────────────────────────────────────────
-- generated-posters — public read, backend/admin write
-- ─────────────────────────────────────────────────────────────
create policy "Public read generated-posters"
  on storage.objects for select
  using (bucket_id = 'generated-posters');

create policy "Admin manages generated-posters"
  on storage.objects for all
  using (bucket_id = 'generated-posters' and is_admin());

-- ─────────────────────────────────────────────────────────────
-- ticket-assets — admin only
-- ─────────────────────────────────────────────────────────────
create policy "Admin manages ticket-assets"
  on storage.objects for all
  using (bucket_id = 'ticket-assets' and is_admin());

-- ─────────────────────────────────────────────────────────────
-- invoice-files — artist sees own, admin sees all
-- ─────────────────────────────────────────────────────────────
create policy "Artist reads own invoice files"
  on storage.objects for select
  using (
    bucket_id = 'invoice-files'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Artist uploads own invoice files"
  on storage.objects for insert
  with check (
    bucket_id = 'invoice-files'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Admin manages invoice-files"
  on storage.objects for all
  using (bucket_id = 'invoice-files' and is_admin());
