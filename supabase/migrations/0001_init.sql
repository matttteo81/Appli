-- ============================================================================
-- « Fil » — Schéma initial de la base de données
-- ----------------------------------------------------------------------------
-- Ce fichier crée TOUT le backend : les tables, la sécurité (RLS), le temps
-- réel, le stockage des photos, et deux fonctions pour créer / rejoindre un
-- couple par code d'invitation.
--
-- Comment l'exécuter (une seule fois) :
--   1. Va sur https://supabase.com → ton projet → onglet « SQL Editor »
--   2. Clique « New query », colle TOUT ce fichier, puis « Run »
--   3. C'est fait ✅  (tu peux le relancer sans risque, il est « idempotent »)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) TABLES
-- ---------------------------------------------------------------------------

-- Un couple = le lien entre deux partenaires.
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  reunion_date timestamptz,
  created_at timestamptz not null default now()
);

-- Le profil d'un·e partenaire (une ligne par compte).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  city_id text,
  expo_push_token text,
  couple_id uuid references public.couples (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Petits mots / post-its partagés.
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  color text not null default '#F2A65A',
  created_at timestamptz not null default now()
);

-- Rituels à cocher ensemble.
create table if not exists public.rituals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  title text not null,
  emoji text,
  done boolean not null default false,
  done_by uuid references public.profiles (id) on delete set null,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

-- L'oiseau virtuel partagé (une seule ligne par couple).
create table if not exists public.bird (
  couple_id uuid primary key references public.couples (id) on delete cascade,
  feed_count integer not null default 0,
  last_fed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Album photo partagé (les images sont dans Supabase Storage, bucket « photos »).
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

-- Playlist partagée.
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  artist text,
  created_at timestamptz not null default now()
);

-- « Tu me manques » (déclenche le popup en temps réel + la notification push).
create table if not exists public.miss_you (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  message text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2) FONCTION UTILITAIRE : le couple de l'utilisateur connecté
-- ---------------------------------------------------------------------------
-- « SECURITY DEFINER » lui permet de lire la table profiles sans être bloquée
-- par la sécurité (RLS), ce qui évite une boucle infinie dans les règles.
create or replace function public.my_couple_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 3) SÉCURITÉ (Row Level Security) — chaque couple ne voit que ses données
-- ---------------------------------------------------------------------------
alter table public.couples  enable row level security;
alter table public.profiles enable row level security;
alter table public.notes    enable row level security;
alter table public.rituals  enable row level security;
alter table public.bird     enable row level security;
alter table public.photos   enable row level security;
alter table public.songs    enable row level security;
alter table public.miss_you enable row level security;

-- PROFILES : je vois mon profil et celui de mon/ma partenaire ; je ne modifie
-- que le mien.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or (couple_id is not null and couple_id = public.my_couple_id())
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- COUPLES : je vois / modifie le couple dont je fais partie.
drop policy if exists couples_select on public.couples;
create policy couples_select on public.couples
  for select using (id = public.my_couple_id());

drop policy if exists couples_update on public.couples;
create policy couples_update on public.couples
  for update using (id = public.my_couple_id())
  with check (id = public.my_couple_id());

-- Petit générateur de règles identiques pour les tables « du couple ».
-- (On les écrit à la main pour rester lisible.)

-- NOTES
drop policy if exists notes_all on public.notes;
create policy notes_all on public.notes
  for all using (couple_id = public.my_couple_id())
  with check (couple_id = public.my_couple_id() and author_id = auth.uid());

-- RITUALS
drop policy if exists rituals_all on public.rituals;
create policy rituals_all on public.rituals
  for all using (couple_id = public.my_couple_id())
  with check (couple_id = public.my_couple_id());

-- BIRD
drop policy if exists bird_all on public.bird;
create policy bird_all on public.bird
  for all using (couple_id = public.my_couple_id())
  with check (couple_id = public.my_couple_id());

-- PHOTOS
drop policy if exists photos_all on public.photos;
create policy photos_all on public.photos
  for all using (couple_id = public.my_couple_id())
  with check (couple_id = public.my_couple_id() and author_id = auth.uid());

-- SONGS
drop policy if exists songs_all on public.songs;
create policy songs_all on public.songs
  for all using (couple_id = public.my_couple_id())
  with check (couple_id = public.my_couple_id() and author_id = auth.uid());

-- MISS_YOU
drop policy if exists miss_you_all on public.miss_you;
create policy miss_you_all on public.miss_you
  for all using (couple_id = public.my_couple_id())
  with check (couple_id = public.my_couple_id() and sender_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4) À l'inscription : créer automatiquement le profil
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5) Créer / rejoindre un couple par code d'invitation
-- ---------------------------------------------------------------------------

-- Crée un couple, m'y rattache, crée l'oiseau, et renvoie le couple.
create or replace function public.create_couple()
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_couple public.couples;
begin
  if public.my_couple_id() is not null then
    raise exception 'Tu fais déjà partie d''un couple.';
  end if;

  -- Génère un code unique de 6 caractères (ex. « 7F3A9C »).
  loop
    v_code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (select 1 from public.couples where invite_code = v_code);
  end loop;

  insert into public.couples (invite_code) values (v_code) returning * into v_couple;
  update public.profiles set couple_id = v_couple.id where id = auth.uid();
  insert into public.bird (couple_id) values (v_couple.id)
    on conflict (couple_id) do nothing;

  return v_couple;
end;
$$;

-- Rejoint un couple existant via son code, et renvoie le couple.
create or replace function public.join_couple(p_code text)
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple public.couples;
  v_members integer;
begin
  if public.my_couple_id() is not null then
    raise exception 'Tu fais déjà partie d''un couple.';
  end if;

  select * into v_couple from public.couples
    where invite_code = upper(trim(p_code));

  if v_couple.id is null then
    raise exception 'Code invalide. Vérifie les 6 caractères.';
  end if;

  select count(*) into v_members from public.profiles
    where couple_id = v_couple.id;
  if v_members >= 2 then
    raise exception 'Ce couple est déjà complet.';
  end if;

  update public.profiles set couple_id = v_couple.id where id = auth.uid();
  return v_couple;
end;
$$;

-- Nourrir l'oiseau (+1) de façon atomique, pour éviter les conflits quand les
-- deux appuient en même temps. Renvoie la ligne mise à jour.
create or replace function public.feed_bird()
returns public.bird
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bird public.bird;
  v_couple uuid := public.my_couple_id();
begin
  if v_couple is null then
    raise exception 'Aucun couple.';
  end if;
  -- Au cas où la ligne n'existerait pas encore.
  insert into public.bird (couple_id) values (v_couple)
    on conflict (couple_id) do nothing;

  update public.bird
    set feed_count = feed_count + 1, last_fed_at = now()
    where couple_id = v_couple
    returning * into v_bird;
  return v_bird;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) TEMPS RÉEL — pour que tout se mette à jour instantanément chez les deux
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'couples','profiles','notes','rituals','bird','photos','songs','miss_you'
  ] loop
    begin
      execute format(
        'alter publication supabase_realtime add table public.%I', t
      );
    exception when duplicate_object then
      -- déjà ajoutée, on ignore
      null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 7) STOCKAGE DES PHOTOS (bucket « photos »)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- Les fichiers sont rangés dans un dossier au nom du couple : « <couple_id>/… ».
-- On autorise seulement les membres du couple à lire / ajouter / supprimer.
drop policy if exists photos_read on storage.objects;
create policy photos_read on storage.objects
  for select using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.my_couple_id()::text
  );

drop policy if exists photos_insert on storage.objects;
create policy photos_insert on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.my_couple_id()::text
  );

drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects
  for delete using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.my_couple_id()::text
  );

-- ============================================================================
-- Fin. Ta base de données est prête ✅
-- ============================================================================
