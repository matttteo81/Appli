-- =====================================================================
-- Batch 20 : correctif « l'œuf ne réapparaît pas » 🥚
-- =====================================================================
-- Symptôme : sur la Ferme, le bouton « 🥚 Nouvel œuf » est cliquable mais
-- appuyer dessus ne fait rien (aucun œuf, aucune erreur).
--
-- Cause : si la ligne `farm` du couple n'existe pas (jamais créée, ou
-- supprimée lors d'un ré-appairage), `pf_new_egg` faisait un UPDATE qui ne
-- touchait AUCUNE ligne — donc il rendait sans rien changer et sans erreur.
--
-- Correctif : `pf_new_egg` (et `pf_ensure`) garantissent d'abord la présence
-- de la ligne ferme (auto-réparation). Aucune modification de l'app requise.
--
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

-- pf_ensure : garantit la ligne ferme + un premier œuf si la ferme est vide.
create or replace function public.pf_ensure(p_couple uuid)
returns public.farm language plpgsql security definer set search_path = public as $$
declare f public.farm;
begin
  if p_couple is distinct from public.current_couple_id() then raise exception 'Pas ton couple.'; end if;
  -- 1) La ligne existe toujours (création idempotente).
  insert into public.farm (couple_id) values (p_couple) on conflict (couple_id) do nothing;
  select * into f from public.farm where couple_id = p_couple;
  -- 2) Premier œuf : uniquement si aucune bête en cours, aucun résident, et
  --    pas de période de repos en cours (respecte le cooldown de 2 jours).
  if f.active_species is null
     and (f.last_grown_at is null or now() - f.last_grown_at >= interval '2 days')
     and not exists (select 1 from public.farm_residents where couple_id = p_couple)
  then
    update public.farm
      set active_species = public._pf_species(p_couple), active_name = null,
          active_feeds = 0, active_fav_fed = 0, active_color = floor(random()*6)::int
      where couple_id = p_couple returning * into f;
  end if;
  return f;
end; $$;

-- pf_new_egg : self-heal — garantit la ligne ferme avant de poser l'œuf.
create or replace function public.pf_new_egg(p_couple uuid)
returns public.farm language plpgsql security definer set search_path = public as $$
declare f public.farm;
begin
  if p_couple is distinct from public.current_couple_id() then raise exception 'Pas ton couple.'; end if;
  -- Auto-réparation : garantit la présence de la ligne ferme.
  insert into public.farm (couple_id) values (p_couple) on conflict (couple_id) do nothing;
  select * into f from public.farm where couple_id = p_couple;
  if f.active_species is not null then raise exception 'Un animal est déjà en cours d''élevage.'; end if;
  if f.last_grown_at is not null and now() - f.last_grown_at < interval '2 days' then
    raise exception 'Encore un peu de repos avant un nouvel œuf 🥚';
  end if;
  update public.farm
    set active_species = public._pf_species(p_couple), active_name = null,
        active_feeds = 0, active_fav_fed = 0, active_color = floor(random()*6)::int
    where couple_id = p_couple returning * into f;
  return f;
end; $$;

revoke execute on function public.pf_ensure(uuid)  from anon, public;
revoke execute on function public.pf_new_egg(uuid) from anon, public;
grant  execute on function public.pf_ensure(uuid)  to authenticated;
grant  execute on function public.pf_new_egg(uuid) to authenticated;
