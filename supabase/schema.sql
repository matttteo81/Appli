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
  id             uuid primary key default gen_random_uuid(),
  invite_code    text unique not null,
  reunion_date   timestamptz,
  together_since date,
  home_photo_path text,
  created_at     timestamptz not null default now()
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
  mood_emoji      text,
  mood_label      text,
  mood_updated_at timestamptz,
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
  artwork_url text,
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

-- ---------------------------------------------------------------------
-- Table : countdowns (comptes à rebours multiples)
-- ---------------------------------------------------------------------
create table if not exists public.countdowns (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  title      text not null,
  emoji      text not null default '📅',
  date       date not null,
  created_at timestamptz not null default now()
);
create index if not exists countdowns_couple_idx on public.countdowns(couple_id, date);

-- ---------------------------------------------------------------------
-- Table : daily_answers (réponses à la question du jour)
-- ---------------------------------------------------------------------
create table if not exists public.daily_answers (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  question_date date not null,
  question_text text not null,
  answer        text not null,
  created_at    timestamptz not null default now(),
  unique (couple_id, author_id, question_date)
);
create index if not exists daily_answers_couple_idx on public.daily_answers(couple_id, question_date desc);

-- ---------------------------------------------------------------------
-- Table : messages (messagerie du couple)
-- ---------------------------------------------------------------------
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_couple_idx on public.messages(couple_id, created_at desc);

-- ---------------------------------------------------------------------
-- Table : game_responses (jeux à deux — table flexible)
-- ---------------------------------------------------------------------
create table if not exists public.game_responses (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  game       text not null,
  item_key   text not null,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  value      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, game, item_key, author_id)
);
create index if not exists game_responses_idx on public.game_responses(couple_id, game);

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
-- Fonction : créer un couple (et rattacher le créateur)
-- Sécurisée : génère un code unique, crée le couple, l'animal, et lie
-- le profil du créateur. Évite d'exposer la table couples en écriture.
-- =====================================================================
create or replace function public.create_couple()
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
  new_couple public.couples;
  attempts int := 0;
begin
  if (select couple_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'Tu fais déjà partie d''un couple.';
  end if;
  loop
    new_code := '';
    for i in 1..6 loop
      new_code := new_code ||
        substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1);
    end loop;
    begin
      insert into public.couples (invite_code) values (new_code)
        returning * into new_couple;
      exit;
    exception when unique_violation then
      attempts := attempts + 1;
      if attempts > 10 then
        raise exception 'Impossible de générer un code, réessaie.';
      end if;
    end;
  end loop;
  update public.profiles
    set couple_id = new_couple.id, updated_at = now()
    where id = auth.uid();
  insert into public.pets (couple_id) values (new_couple.id)
    on conflict (couple_id) do nothing;
  return new_couple;
end;
$$;

-- =====================================================================
-- Fonction : rejoindre un couple avec un code
-- Sécurisée : recherche par code exact SANS exposer la table couples,
-- refuse si déjà en couple ou si le couple est complet (2 membres).
-- =====================================================================
create or replace function public.join_couple_by_code(p_code text)
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.couples;
  member_count int;
begin
  if (select couple_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'Tu fais déjà partie d''un couple.';
  end if;
  select * into target from public.couples
    where invite_code = upper(trim(p_code));
  if not found then
    raise exception 'Code invalide. Vérifie les lettres.';
  end if;
  select count(*) into member_count from public.profiles
    where couple_id = target.id;
  if member_count >= 2 then
    raise exception 'Ce couple est déjà complet.';
  end if;
  update public.profiles
    set couple_id = target.id, updated_at = now()
    where id = auth.uid();
  return target;
end;
$$;

-- =====================================================================
-- Déclencheur : crée automatiquement un profil à chaque inscription
-- (méthode standard Supabase, évite tout souci de création côté client).
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'Moi')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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
alter table public.countdowns       enable row level security;
alter table public.daily_answers    enable row level security;
alter table public.messages         enable row level security;
alter table public.game_responses   enable row level security;

-- --- couples ---------------------------------------------------------
-- Lecture réservée aux MEMBRES du couple (les codes ne sont donc pas
-- exposés). La création et l'adhésion passent par les fonctions
-- sécurisées create_couple() / join_couple_by_code() ci-dessus.
drop policy if exists couples_select on public.couples;
create policy couples_select on public.couples
  for select to authenticated
  using (id = public.current_couple_id());

-- (Plus de politique d'INSERT directe : on passe par create_couple().)
drop policy if exists couples_insert on public.couples;

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
  foreach t in array array['words','rituals','pets','photos','playlist_tracks','nudges','countdowns','daily_answers','messages','game_responses']
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
  foreach t in array array['couples','profiles','words','rituals','pets','photos','playlist_tracks','nudges','countdowns','daily_answers','messages','game_responses']
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
-- Permissions des fonctions : réservées aux utilisateurs CONNECTÉS
-- (empêche un visiteur anonyme d'appeler ces fonctions).
-- =====================================================================
revoke execute on function public.current_couple_id() from anon, public;
revoke execute on function public.create_couple() from anon, public;
revoke execute on function public.join_couple_by_code(text) from anon, public;
revoke execute on function public.feed_pet(uuid, uuid) from anon, public;

grant execute on function public.current_couple_id() to authenticated;
grant execute on function public.create_couple() to authenticated;
grant execute on function public.join_couple_by_code(text) to authenticated;
grant execute on function public.feed_pet(uuid, uuid) to authenticated;

-- =====================================================================
-- Fin du schéma
-- =====================================================================
