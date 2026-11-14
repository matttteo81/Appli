-- =====================================================================
-- Batch 27 : accusé de lecture des messages (« Distribué » / « Lu à … »)
-- =====================================================================
-- Chaque profil garde l'heure à laquelle il a ouvert la messagerie pour la
-- dernière fois. L'app de l'autre s'en sert pour afficher « Lu à 23:31 »
-- sous son dernier message, comme dans Messages sur iPhone.
--
-- Colonne facultative : sans effet sur les versions de l'app déjà installées.
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

alter table public.profiles
  add column if not exists messages_seen_at timestamptz;
