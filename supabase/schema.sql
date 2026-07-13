-- =====================================================================
-- Fil — Schéma de base de données Supabase
-- =====================================================================
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query > Run
-- Il crée toutes les tables, la sécurité (RLS), le temps réel et le
-- bucket de stockage pour les photos.
-- Ce script est "idempotent" : tu peux le relancer sans casser l'existant.
-- =====================================================================

-- Extension pour générer des identifiants uniques
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Table : couples
-- Un couple relie deux partenaires. L'appartenance se fait via
-- profiles.couple_id. Le code d'invitation permet au 2e partenaire de
-- rejoindre.
-- ---------------------------------------------------------------------
create table if not exists public.couples (
  id           uuid primary key default gen_random_uuid(),
  invite_code  text unique not null,
  reunion_date timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Table : profiles
-- Un profil par utilisateur (lié au compte auth de Supabase).
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Moi',
  avatar_emoji text not null default '🌙',
  city_name    text,
  city_lat     double precision,
  city_lng     double precision,
  timezone     text,
  push_token   text,
  couple_id    uuid references public.couples(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Table : words (mots partagés / post-it)
-- ---------------------------------------------------------------------
create table if not exists public.words (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  color      text not null default 'ambre',
  created_at timestamptz not null default now()
);
create index if not exists words_couple_idx on public.words(couple_id, created_at desc);

-- ---------------------------------------------------------------------
-- Table : rituals (rituels à cocher ensemble)
-- ---------------------------------------------------------------------
create table if not exists public.rituals (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  title      text not null,
  emoji      text not null default '✨',
  done       boolean not null default false,
  done_by    uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rituals_couple_idx on public.rituals(couple_id, created_at);

-- ---------------------------------------------------------------------
-- Table : pets (animal virtuel partagé — un seul par couple)
-- ---------------------------------------------------------------------
create table if not exists public.pets (
  couple_id   uuid primary key references public.couples(id) on delete cascade,
  feed_count  integer not null default 0,
  last_fed_by uuid references public.profiles(id) on delete set null,
  last_fed_at timestamptz,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Table : photos (album partagé — le fichier est dans le storage)
-- ---------------------------------------------------------------------
create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples(id) on delete cascade,
  author_id    uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  caption      text,
  created_at   timestamptz not null default now()
);
create index if not exists photos_couple_idx on public.photos(couple_id, created_at desc);

-- ---------------------------------------------------------------------
-- Table : playlist_tracks (playlist à deux)
-- ---------------------------------------------------------------------
create table if not exists public.playlist_tracks (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  artist     text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists playlist_couple_idx on public.playlist_tracks(couple_id, created_at desc);

-- ---------------------------------------------------------------------
-- Table : nudges ("Tu me manques")
-- Une insertion déclenche une notification push vers le partenaire.
-- ---------------------------------------------------------------------
create table if not exists public.nudges (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  from_id    uuid not null references public.profiles(id) on delete cascade,
  to_id      uuid not null references public.profiles(id) on delete cascade,
  message    text not null default 'Tu me manques',
  created_at timestamptz not null default now()
);
create index if not exists nudges_to_idx on public.nudges(to_id, created_at desc);

-- =====================================================================
-- Fonction utilitaire : couple_id de l'utilisateur connecté
-- =====================================================================
create or replace function public.current_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid();
$$;

-- =====================================================================
-- Fonction : nourrir l'animal (incrément atomique)
-- Crée l'animal s'il n'existe pas encore, puis +1 au compteur.
-- =====================================================================
create or replace function public.feed_pet(p_couple uuid, p_user uuid)
returns public.pets
language plpgsql
security invoker
set search_path = public
as $$
declare
  result public.pets;
begin
  insert into public.pets (couple_id) values (p_couple)
    on conflict (couple_id) do nothing;
  update public.pets
    set feed_count = feed_count + 1,
        last_fed_by = p_user,
        last_fed_at = now(),
        updated_at = now()
    where couple_id = p_couple
    returning * into result;
  return result;
end;
$$;

-- =====================================================================
-- Sécurité par ligne (Row Level Security)
-- =====================================================================
alter table public.couples          enable row level security;
alter table public.profiles         enable row level security;
alter table public.words            enable row level security;
alter table public.rituals          enable row level security;
alter table public.pets             enable row level security;
alter table public.photos           enable row level security;
alter table public.playlist_tracks  enable row level security;
alter table public.nudges           enable row level security;

-- --- couples ---------------------------------------------------------
-- Tout le monde connecté peut lire un couple par son code (pour rejoindre)
-- et lire son propre couple. On garde simple : lecture autorisée aux
-- utilisateurs authentifiés, écriture/maj réservée aux membres.
drop policy if exists couples_select on public.couples;
create policy couples_select on public.couples
  for select to authenticated using (true);

drop policy if exists couples_insert on public.couples;
create policy couples_insert on public.couples
  for insert to authenticated with check (true);

drop policy if exists couples_update on public.couples;
create policy couples_update on public.couples
  for update to authenticated
  using (id = public.current_couple_id())
  with check (id = public.current_couple_id());

-- --- profiles --------------------------------------------------------
-- On peut voir son propre profil et celui de son partenaire (même couple).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or (couple_id is not null and couple_id = public.current_couple_id())
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- --- Macro de politiques "membres du couple" pour les tables de contenu
-- (words, rituals, pets, photos, playlist_tracks, nudges)
do $$
declare
  t text;
begin
  foreach t in array array['words','rituals','pets','photos','playlist_tracks','nudges']
  loop
    execute format('drop policy if exists %I_all on public.%I;', t, t);
    execute format($f$
      create policy %1$I_all on public.%1$I
        for all to authenticated
        using (couple_id = public.current_couple_id())
        with check (couple_id = public.current_couple_id());
    $f$, t);
  end loop;
end $$;

-- =====================================================================
-- Temps réel : on ajoute les tables à la publication realtime
-- =====================================================================
do $$
declare
  t text;
begin
  foreach t in array array['couples','profiles','words','rituals','pets','photos','playlist_tracks','nudges']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I;', t);
    exception when duplicate_object then
      -- déjà ajoutée, on ignore
      null;
    end;
  end loop;
end $$;

-- =====================================================================
-- Stockage : bucket "photos" pour l'album partagé
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- Politiques storage : un membre du couple peut lire/écrire les photos
-- rangées dans un dossier nommé d'après son couple_id.
drop policy if exists photos_storage_select on storage.objects;
create policy photos_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  );

drop policy if exists photos_storage_insert on storage.objects;
create policy photos_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  );

drop policy if exists photos_storage_delete on storage.objects;
create policy photos_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  );

-- =====================================================================
-- Fin du schéma
-- =====================================================================
