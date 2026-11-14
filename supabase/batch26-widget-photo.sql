-- =====================================================================
-- Batch 26 : photo du widget 🖼️
-- =====================================================================
-- Chacun peut choisir UNE photo qui s'affiche dans le widget « Photos » de
-- sa moitié (Paramètres → Photo du widget). On stocke simplement le chemin
-- du fichier (bucket « photos ») sur le profil de celui qui choisit.
--
-- Ajout d'une colonne facultative : sans effet sur les versions de l'app
-- déjà installées. À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

alter table public.profiles
  add column if not exists widget_photo_path text;
