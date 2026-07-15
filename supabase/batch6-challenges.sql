-- =====================================================================
-- Batch 6 : les défis photo 📸
-- =====================================================================
-- Un défi photo par jour (le même pour vous deux). Chacun y répond par
-- une photo, taguée avec la date du défi. Les photos apparaissent aussi
-- normalement dans l'album.
--
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

alter table public.photos
  add column if not exists challenge text;
