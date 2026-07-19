-- =============================================================================
-- Wingo — Schéma de base de données (échange linguistique)
-- =============================================================================
-- À exécuter dans l'éditeur SQL de Supabase (une seule fois).
-- Idempotent autant que possible : on peut le rejouer sans casse.
-- =============================================================================

-- Extensions utiles.
create extension if not exists "pgcrypto";        -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- 1) PROFILS
-- -----------------------------------------------------------------------------
-- Un profil par utilisateur. Les langues apprises sont stockées en JSONB :
--   [{ "code": "en", "level": 2 }]  (level 1=débutant … 5=courant)
create table if not exists public.profiles (
  id             uuid primary key references auth.users on delete cascade,
  display_name   text not null default 'Apprenant·e',
  avatar_emoji   text not null default '🙂',
  bio            text,
  native_langs   text[] not null default '{}',   -- ex: {fr}
  learning_langs jsonb  not null default '[]',    -- ex: [{"code":"en","level":2}]
  interests      text[] not null default '{}',    -- ex: {music,travel}
  city_name      text,
  country_code   text,
  lat            double precision,
  lng            double precision,
  timezone       text,
  push_token     text,
  onboarded      boolean not null default false,
  last_active    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2) CONVERSATIONS 1-à-1  (fil de discussion)
-- -----------------------------------------------------------------------------
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations on delete cascade,
  user_id         uuid not null references public.profiles on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists idx_conv_members_user on public.conversation_members(user_id);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id       uuid not null references public.profiles on delete cascade,
  kind            text not null default 'text',  -- 'text' | 'voice' | 'correction'
  body            text,
  translation     text,                          -- traduction affichée à la demande
  audio_path      text,                          -- chemin storage (bucket voice-messages)
  audio_ms        integer,
  corrects_id     uuid references public.messages on delete set null, -- correction d'un msg
  created_at      timestamptz not null default now()
);
create index if not exists idx_messages_conv on public.messages(conversation_id, created_at);

-- Quand un message arrive, on remonte la conversation en haut de la liste.
create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists trg_touch_conversation on public.messages;
create trigger trg_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- -----------------------------------------------------------------------------
-- 3) SALONS VOCAUX
-- -----------------------------------------------------------------------------
create table if not exists public.voice_rooms (
  id            uuid primary key default gen_random_uuid(),
  host_id       uuid not null references public.profiles on delete cascade,
  title         text not null,
  language      text not null,                    -- langue pratiquée (code)
  level         text not null default 'all',      -- beginner|intermediate|advanced|all
  topic         text,
  is_live       boolean not null default true,
  max_speakers  integer not null default 8,
  created_at    timestamptz not null default now()
);
create index if not exists idx_rooms_live on public.voice_rooms(is_live, created_at desc);

create table if not exists public.room_participants (
  room_id   uuid not null references public.voice_rooms on delete cascade,
  user_id   uuid not null references public.profiles on delete cascade,
  role      text not null default 'listener',     -- host|speaker|listener
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists idx_room_participants_room on public.room_participants(room_id);

-- =============================================================================
-- FONCTIONS RPC
-- =============================================================================

-- Trouve (ou crée) la conversation 1-à-1 entre l'utilisateur courant et p_other.
create or replace function public.get_or_create_conversation(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me   uuid := auth.uid();
  conv uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_other = me then raise exception 'cannot chat with yourself'; end if;

  -- Conversation existante partagée par les deux ?
  select cm1.conversation_id into conv
    from public.conversation_members cm1
    join public.conversation_members cm2
      on cm1.conversation_id = cm2.conversation_id
   where cm1.user_id = me and cm2.user_id = p_other
   limit 1;

  if conv is not null then
    return conv;
  end if;

  insert into public.conversations default values returning id into conv;
  insert into public.conversation_members(conversation_id, user_id)
    values (conv, me), (conv, p_other);
  return conv;
end $$;

-- Découverte de partenaires proches, triée par distance puis activité récente.
-- p_speaks : si fourni, ne renvoie que les profils dont c'est une langue native.
create or replace function public.discover_partners(
  p_lat    double precision default null,
  p_lng    double precision default null,
  p_speaks text default null,
  p_limit  integer default 60
)
returns table (
  id             uuid,
  display_name   text,
  avatar_emoji   text,
  bio            text,
  native_langs   text[],
  learning_langs jsonb,
  interests      text[],
  city_name      text,
  country_code   text,
  last_active    timestamptz,
  distance_km    double precision
) language sql stable security definer set search_path = public as $$
  select
    p.id, p.display_name, p.avatar_emoji, p.bio,
    p.native_langs, p.learning_langs, p.interests,
    p.city_name, p.country_code, p.last_active,
    case
      when p_lat is null or p_lng is null or p.lat is null or p.lng is null
        then null
      else
        6371 * 2 * asin(sqrt(
          power(sin(radians(p.lat - p_lat) / 2), 2) +
          cos(radians(p_lat)) * cos(radians(p.lat)) *
          power(sin(radians(p.lng - p_lng) / 2), 2)
        ))
    end as distance_km
  from public.profiles p
  where p.id <> auth.uid()
    and p.onboarded = true
    and (p_speaks is null or p_speaks = any(p.native_langs))
  order by distance_km asc nulls last, p.last_active desc
  limit greatest(1, least(p_limit, 200));
$$;

-- Suppression du compte (obligatoire côté stores). Cascade via FK.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end $$;

-- =============================================================================
-- SÉCURITÉ (Row Level Security)
-- =============================================================================
alter table public.profiles              enable row level security;
alter table public.conversations         enable row level security;
alter table public.conversation_members  enable row level security;
alter table public.messages              enable row level security;
alter table public.voice_rooms           enable row level security;
alter table public.room_participants     enable row level security;

-- --- PROFILS : lecture publique (découverte), écriture de son propre profil ---
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (true);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- --- CONVERSATIONS : réservées à leurs membres ---
-- Fonction d'aide (évite la récursion RLS entre conversation_members et messages).
create or replace function public.is_member(p_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.conversation_members
     where conversation_id = p_conv and user_id = auth.uid()
  );
$$;

drop policy if exists conv_select on public.conversations;
create policy conv_select on public.conversations
  for select using (public.is_member(id));

drop policy if exists convmem_select on public.conversation_members;
create policy convmem_select on public.conversation_members
  for select using (public.is_member(conversation_id));

-- Le membre peut mettre à jour sa propre ligne (last_read_at).
drop policy if exists convmem_update on public.conversation_members;
create policy convmem_update on public.conversation_members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists msg_select on public.messages;
create policy msg_select on public.messages
  for select using (public.is_member(conversation_id));

drop policy if exists msg_insert on public.messages;
create policy msg_insert on public.messages
  for insert with check (
    sender_id = auth.uid() and public.is_member(conversation_id)
  );

-- --- SALONS VOCAUX : lecture publique, gestion par l'hôte ---
drop policy if exists rooms_select on public.voice_rooms;
create policy rooms_select on public.voice_rooms
  for select using (true);

drop policy if exists rooms_insert on public.voice_rooms;
create policy rooms_insert on public.voice_rooms
  for insert with check (host_id = auth.uid());

drop policy if exists rooms_update on public.voice_rooms;
create policy rooms_update on public.voice_rooms
  for update using (host_id = auth.uid()) with check (host_id = auth.uid());

drop policy if exists rooms_delete on public.voice_rooms;
create policy rooms_delete on public.voice_rooms
  for delete using (host_id = auth.uid());

drop policy if exists rp_select on public.room_participants;
create policy rp_select on public.room_participants
  for select using (true);

drop policy if exists rp_insert on public.room_participants;
create policy rp_insert on public.room_participants
  for insert with check (user_id = auth.uid());

drop policy if exists rp_update on public.room_participants;
create policy rp_update on public.room_participants
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists rp_delete on public.room_participants;
create policy rp_delete on public.room_participants
  for delete using (user_id = auth.uid());

-- =============================================================================
-- REALTIME : diffuser les changements utiles au client
-- =============================================================================
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.room_participants;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null; end $$;

-- =============================================================================
-- STORAGE : buckets avatars + messages vocaux
-- =============================================================================
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('voice-messages', 'voice-messages', true)
  on conflict (id) do nothing;

-- Les buckets sont publics : les URL de lecture fonctionnent sans policy SELECT.
-- On n'ajoute donc PAS de policy de lecture large (elle permettrait de LISTER
-- tous les fichiers). On limite l'écriture aux utilisateurs connectés.
drop policy if exists avatars_read on storage.objects;   -- au cas où elle existait
drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

drop policy if exists voice_read on storage.objects;      -- au cas où elle existait
drop policy if exists voice_write on storage.objects;
create policy voice_write on storage.objects
  for insert to authenticated with check (bucket_id = 'voice-messages');

-- =============================================================================
-- DURCISSEMENT (advisors Supabase)
-- =============================================================================
-- Fonction trigger interne : ne pas l'exposer via l'API REST.
revoke all on function public.touch_conversation() from public, anon, authenticated;

-- RPC réservées aux utilisateurs connectés (retrait du rôle anon).
revoke execute on function
  public.discover_partners(double precision, double precision, text, integer) from anon;
revoke execute on function public.get_or_create_conversation(uuid) from anon;
revoke execute on function public.delete_my_account() from anon;
