-- =====================================================================
-- Batch 12 : géolocalisation des photos 📍 (carte des souvenirs)
-- =====================================================================
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

alter table public.photos add column if not exists lat double precision;
alter table public.photos add column if not exists lng double precision;
