-- =====================================================================
-- Batch 9 : GIF dans la messagerie 🎞️
-- =====================================================================
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

-- Un message peut porter une image / un GIF (builtin:<id> ou URL).
alter table public.messages
  add column if not exists image_url text;

-- Le corps texte devient optionnel (un GIF peut être envoyé seul).
alter table public.messages
  alter column body drop not null;

-- Bucket public pour les GIF créés à partir de photos.
insert into storage.buckets (id, name, public)
values ('gifs', 'gifs', true)
on conflict (id) do update set public = true;

drop policy if exists gifs_storage_insert on storage.objects;
create policy gifs_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'gifs'
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  );

drop policy if exists gifs_storage_select on storage.objects;
create policy gifs_storage_select on storage.objects
  for select to public
  using (bucket_id = 'gifs');
