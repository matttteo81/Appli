-- =====================================================================
-- Batch 7 : photo pour la carte « Ensemble depuis »
-- =====================================================================
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

alter table public.couples
  add column if not exists together_photo_path text;
