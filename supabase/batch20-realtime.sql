-- Batch 20 : activer le TEMPS RÉEL (realtime) pour toutes les tables du couple.
--
-- Le code côté app est déjà prêt (useCoupleTable, SharedCanvas, _layout) :
-- il écoute les changements via `postgres_changes`. Pour que ces événements
-- partent réellement, chaque table doit :
--   1) être membre de la publication `supabase_realtime` ;
--   2) avoir REPLICA IDENTITY FULL — indispensable pour que les SUPPRESSIONS
--      filtrées par couple_id (effacer un dessin, supprimer un message…)
--      arrivent bien chez l'autre personne. Sans ça, seule la clé primaire
--      est envoyée sur un DELETE et le filtre couple_id ne correspond jamais.
--
-- Ce script est IDEMPOTENT : tu peux le coller plusieurs fois sans risque.

do $$
declare
  t text;
  tables text[] := array[
    'messages',
    'photos',
    'memories',
    'wishes',
    'love_notes',
    'events',
    'daily_answers',
    'game_responses',
    'words',
    'rituals',
    'playlist_tracks',
    'countdowns',
    'nudges',
    'drawing_strokes'
  ];
begin
  foreach t in array tables loop
    -- On ignore une table qui n'existerait pas (sécurité).
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    -- 1) REPLICA IDENTITY FULL (pour les suppressions en temps réel).
    execute format('alter table public.%I replica identity full;', t);

    -- 2) Ajouter à la publication realtime si pas déjà présente.
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;

-- Vérification : liste des tables désormais en temps réel.
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
order by tablename;
