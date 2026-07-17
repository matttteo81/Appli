-- =====================================================================
-- Batch 17 : suppression de compte 🗑️ (obligatoire pour l'App Store)
-- =====================================================================
-- À coller dans Supabase → SQL Editor → Run.
--
-- Supprime le compte de l'utilisateur connecté. Grâce aux clés étrangères
-- « on delete cascade » du schéma :
--   auth.users → profiles (cascade) → toutes les lignes « author_id » de
--   l'utilisateur (messages, photos, réponses, etc.).
-- Le couple et le partenaire NE sont PAS supprimés : le partenaire garde
-- son compte et peut ré-appairer. On retire juste TES données.
-- =====================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Non authentifié.';
  end if;
  -- La cascade sur profiles + author_id fait le reste.
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from anon, public;
grant  execute on function public.delete_my_account() to authenticated;
