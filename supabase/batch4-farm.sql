-- =====================================================================
-- Batch 4 : la Ferme 🐾
-- =====================================================================
-- Remplace l'oiseau unique par une petite ferme : on élève un animal à
-- deux ; quand il devient adulte, il ne meurt pas — il rejoint le
-- troupeau (renaissance) et un nouvel œuf éclôt.
--
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

-- Table : un animal = une ligne. Plusieurs animaux par couple au fil du temps.
create table if not exists public.farm_animals (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples(id) on delete cascade,
  species     text not null,                 -- emoji de l'espèce (adulte)
  feed_count  integer not null default 0,
  is_active   boolean not null default true, -- celui qu'on élève en ce moment
  generation  integer not null default 1,
  last_fed_by uuid references public.profiles(id) on delete set null,
  last_fed_at timestamptz,
  born_at     timestamptz not null default now(),
  grown_at    timestamptz                    -- quand il a rejoint le troupeau
);

create index if not exists farm_animals_couple_idx
  on public.farm_animals(couple_id, is_active, born_at);

-- Sécurité : réservé aux membres du couple.
alter table public.farm_animals enable row level security;

drop policy if exists farm_animals_all on public.farm_animals;
create policy farm_animals_all on public.farm_animals
  for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

-- Temps réel.
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.farm_animals';
  exception when duplicate_object then null; end;
end $$;

-- ---------------------------------------------------------------------
-- Palette d'espèces : tirage aléatoire d'un emoji d'animal.
-- ---------------------------------------------------------------------
create or replace function public._random_species()
returns text
language sql
set search_path = public
as $$
  select (array[
    '🐦','🐱','🐶','🐰','🦊','🐸','🐥','🐢',
    '🐷','🐨','🦉','🐹','🐮','🐧','🦆','🐭'
  ])[floor(random() * 16) + 1];
$$;

-- ---------------------------------------------------------------------
-- ensure_farm : garantit qu'un animal est en cours d'élevage.
-- ---------------------------------------------------------------------
create or replace function public.ensure_farm(p_couple uuid)
returns public.farm_animals
language plpgsql
security definer
set search_path = public
as $$
declare a public.farm_animals;
begin
  if p_couple is distinct from public.current_couple_id() then
    raise exception 'Ce couple n''est pas le tien.';
  end if;
  select * into a
    from public.farm_animals
    where couple_id = p_couple and is_active
    order by born_at desc
    limit 1;
  if a.id is null then
    insert into public.farm_animals (couple_id, species)
      values (p_couple, public._random_species())
      returning * into a;
  end if;
  return a;
end;
$$;

-- ---------------------------------------------------------------------
-- feed_animal : nourrit l'animal actif (+1). Renvoie la ligne à jour.
-- ---------------------------------------------------------------------
create or replace function public.feed_animal(p_animal uuid)
returns public.farm_animals
language plpgsql
security definer
set search_path = public
as $$
declare a public.farm_animals;
begin
  update public.farm_animals
    set feed_count  = feed_count + 1,
        last_fed_by = auth.uid(),
        last_fed_at = now()
    where id = p_animal
      and couple_id = public.current_couple_id()
    returning * into a;
  if a.id is null then
    raise exception 'Animal introuvable.';
  end if;
  return a;
end;
$$;

-- ---------------------------------------------------------------------
-- farm_rebirth : l'adulte rejoint le troupeau (il ne meurt pas) et un
-- nouvel œuf d'une nouvelle espèce commence à grandir.
-- ---------------------------------------------------------------------
create or replace function public.farm_rebirth(p_animal uuid)
returns public.farm_animals
language plpgsql
security definer
set search_path = public
as $$
declare old public.farm_animals; baby public.farm_animals;
begin
  select * into old
    from public.farm_animals
    where id = p_animal and couple_id = public.current_couple_id();
  if old.id is null then
    raise exception 'Animal introuvable.';
  end if;
  if old.feed_count < 50 then
    raise exception 'Cet animal n''est pas encore adulte.';
  end if;
  update public.farm_animals
    set is_active = false, grown_at = now()
    where id = old.id;
  insert into public.farm_animals (couple_id, species, generation)
    values (old.couple_id, public._random_species(), old.generation + 1)
    returning * into baby;
  return baby;
end;
$$;

-- Droits : seuls les utilisateurs connectés peuvent appeler ces fonctions.
revoke execute on function public._random_species()        from anon, public;
revoke execute on function public.ensure_farm(uuid)        from anon, public;
revoke execute on function public.feed_animal(uuid)        from anon, public;
revoke execute on function public.farm_rebirth(uuid)       from anon, public;
grant  execute on function public.ensure_farm(uuid)        to authenticated;
grant  execute on function public.feed_animal(uuid)        to authenticated;
grant  execute on function public.farm_rebirth(uuid)       to authenticated;
