-- =====================================================================
-- Batch 18 : ferme — déblocages liés au couple 🔓
-- =====================================================================
-- L'espèce de chaque œuf est tirée au hasard PARMI les espèces débloquées :
--   • dès le début : poule 🐔 + cochon 🐷
--   • série ≥ 7 jours 🔥      → lapin 🐰
--   • série ≥ 30 jours 🔥     → chien 🐶
--   • 100 jours ensemble 💞   → chat 🐱
-- Bonus : le jour de votre anniversaire mensuel (même quantième que la date
-- de mise en couple), le délai avant un nouvel œuf est levé.
--
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

-- Espèce au hasard PARMI les espèces débloquées par le couple.
create or replace function public._pf_species(p_couple uuid) returns text
language plpgsql set search_path = public as $$
declare
  c public.couples;
  dtogether int := 0;
  pool text[] := array['hen','pig'];
begin
  select * into c from public.couples where id = p_couple;
  if c.together_since is not null then
    dtogether := greatest(0, (current_date - c.together_since));
  end if;
  if coalesce(c.streak_count, 0) >= 7  then pool := pool || 'rabbit'; end if;
  if coalesce(c.streak_count, 0) >= 30 then pool := pool || 'dog';    end if;
  if dtogether >= 100                  then pool := pool || 'cat';    end if;
  return pool[floor(random() * array_length(pool, 1)) + 1];
end; $$;

-- pf_ensure : premier œuf tiré dans le pool débloqué.
create or replace function public.pf_ensure(p_couple uuid)
returns public.farm language plpgsql security definer set search_path = public as $$
declare f public.farm;
begin
  if p_couple is distinct from public.current_couple_id() then raise exception 'Pas ton couple.'; end if;
  insert into public.farm (couple_id, active_species, active_color)
    values (p_couple, public._pf_species(p_couple), floor(random()*6)::int)
    on conflict (couple_id) do nothing;
  select * into f from public.farm where couple_id = p_couple;
  return f;
end; $$;

-- pf_new_egg : nouvel œuf dans le pool débloqué, délai levé le jour de l'anniversaire.
create or replace function public.pf_new_egg(p_couple uuid)
returns public.farm language plpgsql security definer set search_path = public as $$
declare
  f public.farm;
  c public.couples;
  is_anniv boolean := false;
begin
  if p_couple is distinct from public.current_couple_id() then raise exception 'Pas ton couple.'; end if;
  select * into f from public.farm where couple_id = p_couple;
  if f.active_species is not null then raise exception 'Un animal est déjà en cours d''élevage.'; end if;
  select * into c from public.couples where id = p_couple;
  if c.together_since is not null
     and extract(day from c.together_since) = extract(day from current_date) then
    is_anniv := true;
  end if;
  if f.last_grown_at is not null and not is_anniv
     and now() - f.last_grown_at < interval '2 days' then
    raise exception 'Encore un peu de repos avant un nouvel œuf 🥚';
  end if;
  update public.farm set active_species = public._pf_species(p_couple), active_name = null,
    active_feeds = 0, active_color = floor(random()*6)::int
    where couple_id = p_couple returning * into f;
  return f;
end; $$;

revoke execute on function public._pf_species(uuid) from anon, public;
grant  execute on function public.pf_ensure(uuid)   to authenticated;
grant  execute on function public.pf_new_egg(uuid)  to authenticated;
