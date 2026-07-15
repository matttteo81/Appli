-- =====================================================================
-- Batch 11 : la Ferme pixel-art 🐾 (nouvelle logique)
-- =====================================================================
-- Un œuf au départ, 1 nourrissage/jour/personne, éclosion + prénom,
-- espèce au hasard, adulte au bout de ~15 jours (30 nourrissages), puis
-- l'animal s'installe et 2 jours après on peut prendre un nouvel œuf.
--
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

-- État de la ferme (l'animal en cours d'élevage) : une ligne par couple.
create table if not exists public.farm (
  couple_id      uuid primary key references public.couples(id) on delete cascade,
  active_species text,            -- espèce en cours d'élevage (null = repos)
  active_name    text,            -- prénom donné à l'éclosion
  active_feeds   integer not null default 0,
  active_color   integer not null default 0,  -- couleur de pelage (0..5)
  last_grown_at  timestamptz,     -- quand le dernier animal est devenu adulte
  created_at     timestamptz not null default now()
);
-- (si la table existait déjà sans la colonne)
alter table public.farm add column if not exists active_color integer not null default 0;

-- Animaux devenus adultes : ils restent à la ferme et se baladent.
create table if not exists public.farm_residents (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  species    text not null,
  name       text,
  color      integer not null default 0,
  x          real not null default 0.5,  -- position 0..1 dans le champ
  y          real not null default 0.5,
  born_at    timestamptz not null default now(),
  grown_at   timestamptz not null default now()
);
alter table public.farm_residents add column if not exists color integer not null default 0;
create index if not exists farm_residents_couple_idx on public.farm_residents(couple_id);

-- Journal des nourrissages : 1 par personne et par jour.
create table if not exists public.farm_feeds (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  feed_date date not null default current_date,
  primary key (couple_id, user_id, feed_date)
);

alter table public.farm            enable row level security;
alter table public.farm_residents  enable row level security;
alter table public.farm_feeds      enable row level security;

drop policy if exists farm_all on public.farm;
create policy farm_all on public.farm for all to authenticated
  using (couple_id = public.current_couple_id()) with check (couple_id = public.current_couple_id());
drop policy if exists farm_res_all on public.farm_residents;
create policy farm_res_all on public.farm_residents for all to authenticated
  using (couple_id = public.current_couple_id()) with check (couple_id = public.current_couple_id());
drop policy if exists farm_feeds_all on public.farm_feeds;
create policy farm_feeds_all on public.farm_feeds for all to authenticated
  using (couple_id = public.current_couple_id()) with check (couple_id = public.current_couple_id());

-- Temps réel
do $$ declare t text; begin
  foreach t in array array['farm','farm_residents'] loop
    begin execute format('alter publication supabase_realtime add table public.%I;', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- Espèce au hasard
create or replace function public._pf_species() returns text
language sql set search_path = public as $$
  select (array['hen','cat','dog','rabbit','pig'])[floor(random()*5)+1];
$$;

-- Garantit qu'une ferme existe (avec un premier œuf).
create or replace function public.pf_ensure(p_couple uuid)
returns public.farm language plpgsql security definer set search_path = public as $$
declare f public.farm;
begin
  if p_couple is distinct from public.current_couple_id() then raise exception 'Pas ton couple.'; end if;
  insert into public.farm (couple_id, active_species, active_color)
    values (p_couple, public._pf_species(), floor(random()*6)::int)
    on conflict (couple_id) do nothing;
  select * into f from public.farm where couple_id = p_couple;
  return f;
end; $$;

-- Nourrir : 1 fois par jour et par personne. Fait grandir, installe si adulte.
create or replace function public.pf_feed(p_couple uuid)
returns public.farm language plpgsql security definer set search_path = public as $$
declare f public.farm;
begin
  if p_couple is distinct from public.current_couple_id() then raise exception 'Pas ton couple.'; end if;
  select * into f from public.farm where couple_id = p_couple;
  if f.couple_id is null or f.active_species is null then raise exception 'Aucun animal à nourrir pour le moment.'; end if;
  begin
    insert into public.farm_feeds (couple_id, user_id, feed_date) values (p_couple, auth.uid(), current_date);
  exception when unique_violation then
    raise exception 'Tu l''as déjà nourri aujourd''hui 🌙 Reviens demain !';
  end;
  update public.farm set active_feeds = active_feeds + 1 where couple_id = p_couple returning * into f;
  if f.active_feeds >= 30 then
    insert into public.farm_residents (couple_id, species, name, color, x, y)
      values (p_couple, f.active_species, coalesce(nullif(f.active_name,''), f.active_species), f.active_color,
              0.12 + random()*0.76, 0.25 + random()*0.65);
    update public.farm set active_species = null, active_name = null, active_feeds = 0, last_grown_at = now()
      where couple_id = p_couple returning * into f;
  end if;
  return f;
end; $$;

-- Donner un prénom à l'animal (après éclosion).
create or replace function public.pf_name(p_couple uuid, p_name text)
returns public.farm language plpgsql security definer set search_path = public as $$
declare f public.farm;
begin
  if p_couple is distinct from public.current_couple_id() then raise exception 'Pas ton couple.'; end if;
  update public.farm set active_name = left(trim(p_name), 20) where couple_id = p_couple returning * into f;
  return f;
end; $$;

-- Faire éclore un nouvel œuf (au repos, 2 jours après le dernier adulte).
create or replace function public.pf_new_egg(p_couple uuid)
returns public.farm language plpgsql security definer set search_path = public as $$
declare f public.farm;
begin
  if p_couple is distinct from public.current_couple_id() then raise exception 'Pas ton couple.'; end if;
  select * into f from public.farm where couple_id = p_couple;
  if f.active_species is not null then raise exception 'Un animal est déjà en cours d''élevage.'; end if;
  if f.last_grown_at is not null and now() - f.last_grown_at < interval '2 days' then
    raise exception 'Encore un peu de repos avant un nouvel œuf 🥚';
  end if;
  update public.farm set active_species = public._pf_species(), active_name = null, active_feeds = 0,
    active_color = floor(random()*6)::int
    where couple_id = p_couple returning * into f;
  return f;
end; $$;

revoke execute on function public._pf_species()            from anon, public;
revoke execute on function public.pf_ensure(uuid)          from anon, public;
revoke execute on function public.pf_feed(uuid)            from anon, public;
revoke execute on function public.pf_name(uuid, text)      from anon, public;
revoke execute on function public.pf_new_egg(uuid)         from anon, public;
grant  execute on function public.pf_ensure(uuid)          to authenticated;
grant  execute on function public.pf_feed(uuid)            to authenticated;
grant  execute on function public.pf_name(uuid, text)      to authenticated;
grant  execute on function public.pf_new_egg(uuid)         to authenticated;
