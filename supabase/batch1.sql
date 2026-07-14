-- =====================================================================
-- Fil — Mise à jour "Batch 1"
-- =====================================================================
-- À exécuter UNE FOIS dans : Supabase Dashboard > SQL Editor > Run.
-- Ajoute les colonnes des nouvelles fonctionnalités (humeur, date de
-- mise en couple, photo d'accueil, pochette des morceaux) et le
-- déclencheur de création automatique du profil.
-- Sans risque : relançable, n'efface rien.
-- =====================================================================

alter table public.couples add column if not exists together_since date;
alter table public.couples add column if not exists home_photo_path text;

alter table public.profiles add column if not exists mood_emoji text;
alter table public.profiles add column if not exists mood_label text;
alter table public.profiles add column if not exists mood_updated_at timestamptz;

alter table public.playlist_tracks add column if not exists artwork_url text;

-- Création automatique du profil à l'inscription (corrige « profil introuvable »)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'Moi'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rattrape les comptes déjà créés sans profil
insert into public.profiles (id, display_name)
select u.id, coalesce(nullif(u.raw_user_meta_data->>'display_name', ''), 'Moi')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
