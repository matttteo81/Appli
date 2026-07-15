-- =====================================================================
-- Batch 3 : messages vocaux pour « Tu me manques »
-- =====================================================================
-- Ajoute la possibilité d'envoyer une vraie voix enregistrée avec le
-- bouton cœur, à la place (ou en plus) du texte.
--
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

-- 1) Colonne pour l'URL du clip audio (null = simple message texte).
alter table public.nudges
  add column if not exists audio_url text;

-- 2) Bucket de stockage "voice" (public : l'URL contient un UUID
--    impossible à deviner, ce qui permet de rejouer le clip même
--    quand la notification est ouverte plus tard).
insert into storage.buckets (id, name, public)
values ('voice', 'voice', true)
on conflict (id) do update set public = true;

-- 3) Politiques : un membre du couple peut déposer un clip dans le
--    dossier nommé d'après son couple_id ; la lecture est publique.
drop policy if exists voice_storage_insert on storage.objects;
create policy voice_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'voice'
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  );

drop policy if exists voice_storage_delete on storage.objects;
create policy voice_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'voice'
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  );

drop policy if exists voice_storage_select on storage.objects;
create policy voice_storage_select on storage.objects
  for select to public
  using (bucket_id = 'voice');
